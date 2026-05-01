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
export async function executeRepoXRay(): Promise<void> {
  try {
    // Get workspace root path
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder is open. Please open a folder first.');
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const workspaceName = path.basename(workspaceRoot);

    // Show progress notification
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Analyzing ${workspaceName}...`,
        cancellable: false,
      },
      async (progress) => {
        try {
          // Step 1: Gather context
          progress.report({ message: 'Gathering repository context...', increment: 10 });
          const context = await gatherRepoContext(workspaceRoot);

          // Step 2: Execute prompts sequentially
          progress.report({ message: 'Identifying entry points...', increment: 20 });
          const entryPoints = await executePrompt1(context);

          progress.report({ message: 'Analyzing dependency graph...', increment: 40 });
          const dependencyGraph = await executePrompt2(context, entryPoints);

          progress.report({ message: 'Generating artifacts...', increment: 60 });
          const artifacts = await executePrompt3(context, entryPoints, dependencyGraph);

          progress.report({ message: 'Identifying weird parts...', increment: 80 });
          const weirdParts = await executePrompt4(context, entryPoints, dependencyGraph, artifacts);

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

          // Step 4: Render markdown
          progress.report({ message: 'Generating markdown document...', increment: 90 });
          const outputPath = await renderMarkdown(result, workspaceRoot);

          // Step 5: Open in preview
          progress.report({ message: 'Opening preview...', increment: 100 });
          const doc = await vscode.workspace.openTextDocument(outputPath);
          await vscode.commands.executeCommand('markdown.showPreview', doc.uri);

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
    console.error('Repo X-Ray error:', error);
  }
}

/**
 * Gather repository context by reading file tree and key files
 */
async function gatherRepoContext(workspaceRoot: string) {
  try {
    // Generate file tree
    const fileTree = await generateFileTree(workspaceRoot);

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
 * Generate a file tree representation of the repository
 */
async function generateFileTree(rootPath: string, maxDepth: number = 4): Promise<string> {
  const lines: string[] = [];
  const ignoreDirs = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    'out',
    '.vscode',
    '__pycache__',
    '.pytest_cache',
    'venv',
    '.env',
  ]);

  async function traverse(dirPath: string, prefix: string = '', depth: number = 0) {
    if (depth > maxDepth) {
      return;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const filtered = entries.filter(
        (entry) => !entry.name.startsWith('.') || entry.name === '.env.example'
      );

      for (let i = 0; i < filtered.length; i++) {
        const entry = filtered[i];
        const isLast = i === filtered.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const extension = isLast ? '    ' : '│   ';

        if (entry.isDirectory()) {
          if (ignoreDirs.has(entry.name)) {
            lines.push(`${prefix}${connector}${entry.name}/ (ignored)`);
            continue;
          }
          lines.push(`${prefix}${connector}${entry.name}/`);
          await traverse(path.join(dirPath, entry.name), prefix + extension, depth + 1);
        } else {
          lines.push(`${prefix}${connector}${entry.name}`);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  const rootName = path.basename(rootPath);
  lines.push(`${rootName}/`);
  await traverse(rootPath);

  return lines.join('\n');
}

/**
 * Execute Prompt 1: Identify Entry Points
 */
async function executePrompt1(context: any): Promise<EntryPointsResponse> {
  const prompt = buildEntryPointsPrompt(context);
  const response = await ask(prompt);

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
  entryPoints: EntryPointsResponse
): Promise<DependencyGraphResponse> {
  const prompt = buildDependencyGraphPrompt(context, entryPoints);
  const response = await ask(prompt);

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
  dependencyGraph: DependencyGraphResponse
): Promise<ArtifactsResponse> {
  const prompt = buildArtifactsPrompt(context, entryPoints, dependencyGraph);
  const response = await ask(prompt);

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
  artifacts: ArtifactsResponse
): Promise<WeirdPartsResponse> {
  const prompt = buildWeirdPartsPrompt(context, entryPoints, dependencyGraph, artifacts);
  const response = await ask(prompt);

  if (!response.success || !response.data) {
    throw new Error(`Prompt 4 failed: ${response.error || 'No data returned'}`);
  }

  try {
    return validateResponse(response.data, (data) => WeirdPartsResponseSchema.parse(data));
  } catch (error) {
    throw new Error(`Prompt 4 validation failed: ${(error as Error).message}`);
  }
}
