import { Logger } from '../../utils/logger';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ask, validateResponse } from '../../bob/client';
import {
  buildRepoContext,
  buildEntryPointsPrompt,
  buildDependencyGraphPrompt,
  buildArtifactsPrompt,
  buildWeirdPartsPrompt,
} from './prompt';
import { generateFileTree } from '../../utils/file-tree';
import {
  EntryPointsResponseSchema,
  DependencyGraphResponseSchema,
  ArtifactsResponseSchema,
  WeirdPartsResponseSchema,
  RepoXRayResult,
  EntryPointsResponse,
  DependencyGraphResponse,
  ArtifactsResponse,
  WeirdPartsResponse,
} from './schema';
import { renderMarkdown } from './render';

/**
 * Execute the Repo X-Ray command
 * Analyzes the repository and generates comprehensive onboarding documentation
 */
export async function executeRepoXRay(context: vscode.ExtensionContext): Promise<void> {
  try {
    // Get workspace root path
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder is open. Please open a folder first.');
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const workspaceName = path.basename(workspaceRoot);

    // Incremental Analysis: Check for changes since last run
    const lastAnalysisTime = context.workspaceState.get<number>(`onboard.xray.lastTime:${workspaceRoot}`);
    let hasChanges = true;
    
    if (lastAnalysisTime) {
      try {
        const { execFileSync } = require('child_process');
        const diff = execFileSync('git', ['diff', '--name-only', `@{${new Date(lastAnalysisTime).toISOString()}}`], { cwd: workspaceRoot }).toString();
        hasChanges = diff.trim().length > 0;
      } catch (e) {
        // If git fails, assume changes
      }
    }

    if (!hasChanges) {
      const choice = await vscode.window.showInformationMessage(
        'No changes detected since last analysis. Re-run anyway?',
        'Yes', 'No'
      );
      if (choice !== 'Yes') {return;}
    }

    // Show progress notification
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Analyzing ${workspaceName}...`,
        cancellable: true,
      },
      async (progress, token) => {
        try {
          // Step 1: Gather context (with caching)
          progress.report({ message: 'Gathering repository context...', increment: 10 });
          
          let fileTree = context.workspaceState.get<string>(`onboard.xray.fileTree:${workspaceRoot}`);
          if (!fileTree || hasChanges) {
            fileTree = await generateFileTree(workspaceRoot);
            context.workspaceState.update(`onboard.xray.fileTree:${workspaceRoot}`, fileTree);
          }

          const repoContext = await gatherRepoContext(workspaceRoot, fileTree);
          if (token.isCancellationRequested) {return;}

          // Step 2: Execute prompts sequentially
          progress.report({ message: 'Identifying entry points...', increment: 10 });
          const entryPoints = await executePrompt1(context, token, progress);
          if (token.isCancellationRequested) {return;}

          progress.report({ message: 'Analyzing dependency graph...', increment: 20 });
          const dependencyGraph = await executePrompt2(context, entryPoints, token, progress);
          if (token.isCancellationRequested) {return;}

          progress.report({ message: 'Generating artifacts...', increment: 20 });
          const diagramFormat = vscode.workspace.getConfiguration('onboard').get<string>('diagramFormat', 'Mermaid');
          const artifacts = await executePrompt3(context, entryPoints, dependencyGraph, diagramFormat, token, progress);
          if (token.isCancellationRequested) {return;}

          progress.report({ message: 'Identifying weird parts...', increment: 20 });
          const weirdParts = await executePrompt4(context, entryPoints, dependencyGraph, artifacts, token, progress);
          if (token.isCancellationRequested) {return;}

          // Step 3: Combine results
          const result: RepoXRayResult = {
            entryPoints,
            dependencyGraph,
            artifacts,
            weirdParts,
            metadata: {
              repositoryPath: workspaceRoot,
              analyzedAt: new Date().toISOString(),
              analysisVersion: '1.0.0',
            },
          };

          // Save analysis time
          context.workspaceState.update(`onboard.xray.lastTime:${workspaceRoot}`, Date.now());

          // Always save JSON for future comparisons
          const jsonPath = path.join(workspaceRoot, 'REPO_XRAY.json');
          let previousResult: RepoXRayResult | undefined;
          try {
            const oldData = await fs.readFile(jsonPath, 'utf-8');
            previousResult = JSON.parse(oldData);
          } catch (e) {}
          
          await fs.writeFile(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

          // Step 4: Render markdown or other format
          progress.report({ message: 'Generating document...', increment: 10 });
          const format = vscode.workspace.getConfiguration('onboard').get<string>('outputFormat', 'Markdown');
          
          let outputPath: string;
          if (format === 'JSON') {
            outputPath = jsonPath;
          } else if (format === 'HTML') {
            const mdPath = await renderMarkdown(result, workspaceRoot, previousResult);
            const mdContent = await fs.readFile(mdPath, 'utf-8');
            outputPath = path.join(workspaceRoot, 'REPO_XRAY.html');
            await fs.writeFile(outputPath, `<html><body><pre>${mdContent}</pre></body></html>`, 'utf-8');
            await fs.unlink(mdPath); // cleanup md
          } else {
            outputPath = await renderMarkdown(result, workspaceRoot, previousResult);
          }

          // Step 5: Open in preview
          progress.report({ message: 'Opening preview...', increment: 10 });
          const doc = await vscode.workspace.openTextDocument(outputPath);
          
          if (format === 'Markdown') {
            await vscode.commands.executeCommand('markdown.showPreview', doc.uri);
          } else {
            await vscode.window.showTextDocument(doc);
          }

          vscode.window.showInformationMessage(
            `✅ Repo X-Ray complete! Document saved to ${path.basename(outputPath)}`
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Repo X-Ray failed: ${errorMessage}`);
          throw error;
        }
      }
    );
  } catch (error) {
    Logger.error('Repo X-Ray error:', error);
  }
}

/**
 * Gather repository context by reading file tree and key files
 */
async function gatherRepoContext(workspaceRoot: string, cachedFileTree?: string) {
  try {
    // Use cached file tree if available
    const fileTree = cachedFileTree || await generateFileTree(workspaceRoot);

    // Read key files
    const additionalFiles: Record<string, string> = {};

    // Try to read package.json
    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    try {
      additionalFiles['package.json'] = await fs.readFile(packageJsonPath, 'utf-8');
    } catch {
      // File doesn't exist, skip
    }

    // Try to read README.md
    const readmePath = path.join(workspaceRoot, 'README.md');
    try {
      additionalFiles['README.md'] = await fs.readFile(readmePath, 'utf-8');
    } catch {
      // File doesn't exist, skip
    }

    return buildRepoContext(workspaceRoot, fileTree, additionalFiles);
  } catch (error) {
    throw new Error(`Failed to gather repository context: ${(error as Error).message}`);
  }
}

/**
 * Execute Prompt 1: Identify Entry Points
 */
async function executePrompt1(context: any, token: vscode.CancellationToken, progress: vscode.Progress<{ message?: string; increment?: number }>): Promise<EntryPointsResponse> {
  const prompt = buildEntryPointsPrompt(context);
  let chunkCount = 0;
  const response = await ask(prompt, { 
    token, 
    onChunk: () => {
      chunkCount++;
      if (chunkCount % 5 === 0) {progress.report({ message: `Identifying entry points (receiving data...)` });}
    }
  });

  if (!response.success || !response.data) {
    throw new Error(`Prompt 1 failed: ${response.error || 'No data returned'}`);
  }

  try {
    return validateResponse(response.data, (data) => EntryPointsResponseSchema.parse(data));
  } catch (error) {
    throw new Error(`Prompt 1 validation failed: ${(error as Error).message}`);
  }
}

/**
 * Execute Prompt 2: Analyze Dependency Graph
 */
async function executePrompt2(
  context: any,
  entryPoints: EntryPointsResponse,
  token: vscode.CancellationToken,
  progress: vscode.Progress<{ message?: string; increment?: number }>
): Promise<DependencyGraphResponse> {
  const prompt = buildDependencyGraphPrompt(context, entryPoints);
  let chunkCount = 0;
  const response = await ask(prompt, { 
    token, 
    onChunk: () => {
      chunkCount++;
      if (chunkCount % 5 === 0) {progress.report({ message: `Analyzing dependency graph (receiving data...)` });}
    }
  });

  if (!response.success || !response.data) {
    throw new Error(`Prompt 2 failed: ${response.error || 'No data returned'}`);
  }

  try {
    return validateResponse(response.data, (data) => DependencyGraphResponseSchema.parse(data));
  } catch (error) {
    throw new Error(`Prompt 2 validation failed: ${(error as Error).message}`);
  }
}

/**
 * Execute Prompt 3: Generate Artifacts
 */
async function executePrompt3(
  context: any,
  entryPoints: EntryPointsResponse,
  dependencyGraph: DependencyGraphResponse,
  diagramFormat: string | undefined,
  token: vscode.CancellationToken,
  progress: vscode.Progress<{ message?: string; increment?: number }>
): Promise<ArtifactsResponse> {
  const prompt = buildArtifactsPrompt(context, entryPoints, dependencyGraph, diagramFormat);
  let chunkCount = 0;
  const response = await ask(prompt, { 
    token, 
    onChunk: () => {
      chunkCount++;
      if (chunkCount % 5 === 0) {progress.report({ message: `Generating artifacts (receiving data...)` });}
    }
  });

  if (!response.success || !response.data) {
    throw new Error(`Prompt 3 failed: ${response.error || 'No data returned'}`);
  }

  try {
    return validateResponse(response.data, (data) => ArtifactsResponseSchema.parse(data));
  } catch (error) {
    throw new Error(`Prompt 3 validation failed: ${(error as Error).message}`);
  }
}

/**
 * Execute Prompt 4: Identify Weird Parts
 */
async function executePrompt4(
  context: any,
  entryPoints: EntryPointsResponse,
  dependencyGraph: DependencyGraphResponse,
  artifacts: ArtifactsResponse,
  token: vscode.CancellationToken,
  progress: vscode.Progress<{ message?: string; increment?: number }>
): Promise<WeirdPartsResponse> {
  const prompt = buildWeirdPartsPrompt(context, entryPoints, dependencyGraph, artifacts);
  let chunkCount = 0;
  const response = await ask(prompt, { 
    token, 
    onChunk: () => {
      chunkCount++;
      if (chunkCount % 5 === 0) {progress.report({ message: `Identifying weird parts (receiving data...)` });}
    }
  });

  if (!response.success || !response.data) {
    throw new Error(`Prompt 4 failed: ${response.error || 'No data returned'}`);
  }

  try {
    return validateResponse(response.data, (data) => WeirdPartsResponseSchema.parse(data));
  } catch (error) {
    throw new Error(`Prompt 4 validation failed: ${(error as Error).message}`);
  }
}
