import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ask, validateResponse } from '../../bob/client';
import { buildStarterTasksPrompt, SearchHit, StarterTasksContext } from './prompt';
import { validateStarterTasks, StarterTasksResponse } from './schema';
import { renderTaskCard, renderStarterTasksSummary } from './render';

/**
 * Execute the Find Starter Tasks command
 */
export async function executeFindStarterTasks(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('Please open a folder first.');
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const workspaceName = path.basename(workspaceRoot);
  const tasksDir = path.join(workspaceRoot, 'ONBOARD_TASKS');

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Searching for Starter Tasks...',
      cancellable: true,
    },
    async (progress, token) => {
      try {
        progress.report({ message: 'Scanning codebase for TODOs...', increment: 10 });
        const hits = await scanForTodos(workspaceRoot, token);
        
        if (token.isCancellationRequested) return;

        if (hits.length === 0) {
          vscode.window.showInformationMessage('No TODO/FIXME comments found in the codebase.');
          return;
        }

        progress.report({ message: 'Generating file tree...', increment: 20 });
        const fileTree = await generateFileTree(workspaceRoot, 3);
        
        if (token.isCancellationRequested) return;

        progress.report({ message: 'Analyzing with Bob...', increment: 30 });
        const context: StarterTasksContext = {
          repositoryName: workspaceName,
          repositoryPath: workspaceRoot,
          fileTree,
          searchHits: hits,
          techStack: await detectTechStack(workspaceRoot),
        };

        const prompt = buildStarterTasksPrompt(context);
        const response = await ask<StarterTasksResponse>(prompt);

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to get response from Bob');
        }

        if (token.isCancellationRequested) return;

        progress.report({ message: 'Validating tasks...', increment: 10 });
        const validatedResponse = validateResponse(response.data, validateStarterTasks);

        progress.report({ message: 'Saving task cards...', increment: 20 });
        
        // Create ONBOARD_TASKS directory
        await fs.mkdir(tasksDir, { recursive: true });

        // Save individual task cards
        const savedFiles: vscode.Uri[] = [];
        for (let i = 0; i < validatedResponse.tasks.length; i++) {
          const task = validatedResponse.tasks[i];
          const content = renderTaskCard(task, i, validatedResponse.tasks.length);
          const filePath = path.join(tasksDir, `task-${i + 1}.md`);
          await fs.writeFile(filePath, content, 'utf-8');
          savedFiles.push(vscode.Uri.file(filePath));
        }

        progress.report({ message: 'Finalizing...', increment: 10 });
        
        // Render and show summary
        const summaryContent = renderStarterTasksSummary(validatedResponse);
        const summaryDoc = await vscode.workspace.openTextDocument({ 
          language: 'markdown', 
          content: summaryContent 
        });
        await vscode.window.showTextDocument(summaryDoc, { preview: true, viewColumn: vscode.ViewColumn.One });
        await vscode.commands.executeCommand('markdown.showPreview', summaryDoc.uri);

        // Open the first task card if available
        if (savedFiles.length > 0) {
          const taskDoc = await vscode.workspace.openTextDocument(savedFiles[0]);
          await vscode.window.showTextDocument(taskDoc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
          await vscode.commands.executeCommand('markdown.showPreview', savedFiles[0]);
        }

        vscode.window.showInformationMessage(`Generated ${validatedResponse.tasks.length} starter tasks in ONBOARD_TASKS/`);

      } catch (error) {
        if (error instanceof Error && error.message === 'Operation cancelled') {
          return;
        }
        vscode.window.showErrorMessage(`Failed to find starter tasks: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}

/**
 * Scans files for TODO and FIXME comments
 */
async function scanForTodos(workspaceRoot: string, token: vscode.CancellationToken): Promise<SearchHit[]> {
  const hits: SearchHit[] = [];
  const todoRegex = /\b(TODO|FIXME)\b(.*)$/gim;
  
  // Exclude common large or irrelevant directories
  const excludePattern = '{**/node_modules/**,**/dist/**,**/out/**,**/.git/**,**/.bob/**,**/eval/**}';
  const files = await vscode.workspace.findFiles('**/*.{ts,js,py,go,java,c,cpp,h,hpp,rs,md}', excludePattern, 500, token);

  for (const fileUri of files) {
    if (token.isCancellationRequested) break;
    
    try {
      const content = await fs.readFile(fileUri.fsPath, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        let match;
        while ((match = todoRegex.exec(line)) !== null) {
          const startLine = Math.max(0, index - 5);
          const endLine = Math.min(lines.length - 1, index + 5);
          const surroundingCode = lines.slice(startLine, endLine + 1).join('\n');

          hits.push({
            filePath: vscode.workspace.asRelativePath(fileUri.fsPath),
            lineNumber: index + 1,
            content: line.trim(),
            surroundingCode,
          });
          
          // Limit to first 50 hits to avoid overwhelming Bob
          if (hits.length >= 50) return;
        }
      });
      
      if (hits.length >= 50) break;
    } catch (error) {
      // Skip files we can't read
    }
  }

  return hits;
}

/**
 * Simplified file tree generator
 */
async function generateFileTree(rootPath: string, maxDepth: number = 3): Promise<string> {
  const lines: string[] = [];
  const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'out', '.vscode', 'eval']);

  async function traverse(dirPath: string, prefix: string = '', depth: number = 0) {
    if (depth > maxDepth) return;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const filtered = entries.filter(e => !e.name.startsWith('.') || e.name === '.env.example');

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
    } catch (error) {}
  }

  lines.push(`${path.basename(rootPath)}/`);
  await traverse(rootPath);
  return lines.join('\n');
}

/**
 * Detects the tech stack based on files in the root
 */
async function detectTechStack(workspaceRoot: string): Promise<string[]> {
  const stack: string[] = [];
  try {
    const files = await fs.readdir(workspaceRoot);
    if (files.includes('package.json')) stack.push('TypeScript/JavaScript (Node.js)');
    if (files.includes('requirements.txt') || files.includes('pyproject.toml')) stack.push('Python');
    if (files.includes('go.mod')) stack.push('Go');
    if (files.includes('Cargo.toml')) stack.push('Rust');
    if (files.includes('pom.xml')) stack.push('Java (Maven)');
  } catch (error) {}
  return stack;
}
