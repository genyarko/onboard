import * as vscode from 'vscode';
import { WhyIsThisHereService, formatExplanationMarkdown } from './provider';

export const whyIsThisHereService = new WhyIsThisHereService();

/**
 * Executes the "Why Is This Here?" command.
 * Gathers context around the current cursor position and uses the Bob API to explain its purpose.
 * It opens a new Markdown preview with the explanation.
 */
export async function executeWhyIsThisHere(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('Open a file and place the cursor on a line first.');
    return;
  }

  const document = editor.document;
  const selection = editor.selection;
  const range = new vscode.Range(
    selection.start.line,
    selection.start.character,
    selection.end.line,
    selection.end.character
  );
  
  // If selection is empty, just take the current line
  const effectiveRange = selection.isEmpty 
    ? new vscode.Range(selection.start.line, 0, selection.start.line, document.lineAt(selection.start.line).text.length)
    : range;

  const lineContent = document.getText(effectiveRange).trim();

  let explanation;
  try {
    explanation = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Why Is This Here?',
        cancellable: true,
      },
      (progress, token) => whyIsThisHereService.analyze(document, effectiveRange, progress, token)
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Operation cancelled') {
      return;
    }
    let errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('ENOENT') || errorMessage.includes('EACCES') || errorMessage.includes('EPERM')) {
      errorMessage = `File system error: ${errorMessage}. Please check your workspace file permissions.`;
    } else if (errorMessage.includes('Circuit breaker is OPEN')) {
      errorMessage = `Bob API is temporarily unavailable. Please check your network connection or try again later.`;
    } else if (errorMessage.includes('BOB_API_KEY') || errorMessage.includes('WATSONX_API_KEY')) {
      errorMessage = `Authentication failed: ${errorMessage}. Please check your API credentials in settings.`;
    }
    vscode.window.showErrorMessage(`Why Is This Here failed: ${errorMessage}`);
    return;
  }

  if (!explanation) {
    return;
  }

  const markdown = formatExplanationMarkdown(
    explanation,
    vscode.workspace.asRelativePath(document.uri.fsPath),
    effectiveRange.start.line === effectiveRange.end.line 
      ? effectiveRange.start.line + 1 
      : `${effectiveRange.start.line + 1}-${effectiveRange.end.line + 1}`,
    lineContent
  );

  const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: markdown });
  await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
  await vscode.commands.executeCommand('markdown.showPreview', doc.uri);
}

/**
 * Clears the in-memory cache used by the "Why Is This Here?" service.
 */
export function clearWhyIsThisHereCache(): void {
  whyIsThisHereService.clearCache();
}
