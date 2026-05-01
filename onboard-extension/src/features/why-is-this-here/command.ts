import * as vscode from 'vscode';
import { WhyIsThisHereService, formatExplanationMarkdown } from './provider';

const service = new WhyIsThisHereService();

export async function executeWhyIsThisHere(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('Open a file and place the cursor on a line first.');
    return;
  }

  const document = editor.document;
  const position = editor.selection.active;
  const lineContent = document.lineAt(position.line).text;

  const explanation = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Why Is This Here?',
      cancellable: true,
    },
    (progress, token) => service.analyze(document, position, progress, token)
  );

  if (!explanation) {
    return;
  }

  const markdown = formatExplanationMarkdown(
    explanation,
    vscode.workspace.asRelativePath(document.uri.fsPath),
    position.line + 1,
    lineContent
  );

  const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: markdown });
  await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
  await vscode.commands.executeCommand('markdown.showPreview', doc.uri);
}

export function clearWhyIsThisHereCache(): void {
  service.clearCache();
}
