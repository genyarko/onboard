import * as vscode from 'vscode';
import { getLineHistory, getCommitDetails, getLinkedPRs, isGitRepository } from './git';
import { generateWhyIsThisHerePrompt, generateFallbackPrompt } from './prompt';
import { validateExplanation, WhyIsThisHereExplanation } from './schema';
import { ask, validateResponse } from '../../bob/client';
import { Logger } from '../../utils/logger';

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;

export class WhyIsThisHereHoverProvider implements vscode.HoverProvider {
  constructor(private service: WhyIsThisHereService) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | null> {
    const editor = vscode.window.activeTextEditor;
    let effectiveRange: vscode.Range;

    // Support multi-line selections: If position is within a multi-line selection, use it
    if (editor && !editor.selection.isEmpty && editor.selection.contains(position)) {
      effectiveRange = editor.selection;
    } else {
      // Fallback: Expand to the whole line for context
      effectiveRange = new vscode.Range(position.line, 0, position.line, document.lineAt(position.line).text.length);
    }

    const content = document.getText(effectiveRange).trim();
    if (!content) {return null;}

    let explanation;
    try {
      explanation = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: 'Analyzing code context...',
        },
        (progress, progressToken) => {
          // Listen to either token
          return this.service.analyze(document, effectiveRange, progress, token);
        }
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'Operation cancelled') {
        return null;
      }
      Logger.error('Hover provider error:', error);
      return null;
    }

    if (!explanation) {return null;}

    const markdown = formatExplanationMarkdown(
      explanation,
      vscode.workspace.asRelativePath(document.uri.fsPath),
      effectiveRange.isSingleLine 
        ? position.line + 1 
        : `${effectiveRange.start.line + 1}-${effectiveRange.end.line + 1}`,
      content
    );

    const markdownString = new vscode.MarkdownString(markdown);
    markdownString.isTrusted = true;
    return new vscode.Hover(markdownString);
  }
}

export class WhyIsThisHereService {
  private cache = new Map<string, { explanation: WhyIsThisHereExplanation; timestamp: number }>();

  async analyze(
    document: vscode.TextDocument,
    range: vscode.Range,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
  ): Promise<WhyIsThisHereExplanation | null> {
    const lineContent = document.getText(range).trim();
    if (!lineContent) {
      return null;
    }

    const cacheKey = `${document.uri.fsPath}:${range.start.line}-${range.end.line}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.explanation;
    }

    const isGitRepo = await isGitRepository();
    const explanation = isGitRepo
      ? await this.analyzeWithGitHistory(document, range, lineContent, progress, token)
      : await this.analyzeWithoutGitHistory(document, range, lineContent, progress, token);

    if (token.isCancellationRequested) {
      return null;
    }

    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(cacheKey, { explanation, timestamp: Date.now() });

    return explanation;
  }

  private async analyzeWithGitHistory(
    document: vscode.TextDocument,
    range: vscode.Range,
    lineContent: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
  ): Promise<WhyIsThisHereExplanation> {
    progress.report({ message: 'Getting code context...', increment: 10 });
    const surroundingCode = this.getSurroundingContext(document, range, 30);
    if (token.isCancellationRequested) {throw new Error('Operation cancelled');}

    progress.report({ message: 'Fetching git history...', increment: 20 });
    const history = await getLineHistory(document.uri.fsPath, range.start.line + 1, range.end.line + 1);
    if (token.isCancellationRequested) {throw new Error('Operation cancelled');}

    progress.report({ message: 'Getting commit details...', increment: 20 });
    const commitDetails = history.length > 0 ? await getCommitDetails(history[0].hash) : null;
    if (token.isCancellationRequested) {throw new Error('Operation cancelled');}

    progress.report({ message: 'Fetching PR details...', increment: 10 });
    const linkedPRs = history.length > 0 ? await getLinkedPRs(history[0].hash) : [];
    if (token.isCancellationRequested) {throw new Error('Operation cancelled');}

    progress.report({ message: 'Asking Bob...', increment: 30 });
    const prompt = generateWhyIsThisHerePrompt({
      filePath: vscode.workspace.asRelativePath(document.uri.fsPath),
      lineNumber: range.start.line === range.end.line ? range.start.line + 1 : `${range.start.line + 1}-${range.end.line + 1}`,
      lineContent,
      history,
      commitDetails: commitDetails || undefined,
      linkedPRs: linkedPRs.length > 0 ? linkedPRs : undefined,
      surroundingCode,
    });
    const response = await ask<WhyIsThisHereExplanation>(prompt, { token });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get response from Bob');
    }
    if (token.isCancellationRequested) {throw new Error('Operation cancelled');}

    progress.report({ message: 'Validating response...', increment: 10 });
    const explanation = validateResponse(response.data, validateExplanation);
    
    if (history.length > 0) {
       const latest = history[0];
       // Adding git blame inline
       explanation.notes = (explanation.notes ? explanation.notes + '\n\n' : '') + 
         `**Git Blame:** Modified by ${latest.author} on ${latest.date.toLocaleDateString()} (${latest.hash.substring(0,7)})\n> ${latest.message}`;
    }
    return explanation;
  }

  private async analyzeWithoutGitHistory(
    document: vscode.TextDocument,
    range: vscode.Range,
    lineContent: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
  ): Promise<WhyIsThisHereExplanation> {
    progress.report({ message: 'Getting code context...', increment: 20 });
    const surroundingCode = this.getSurroundingContext(document, range, 30);
    if (token.isCancellationRequested) {throw new Error('Operation cancelled');}

    progress.report({ message: 'Asking Bob...', increment: 50 });
    const prompt = generateFallbackPrompt(
      vscode.workspace.asRelativePath(document.uri.fsPath),
      range.start.line === range.end.line ? range.start.line + 1 : `${range.start.line + 1}-${range.end.line + 1}`,
      lineContent,
      surroundingCode
    );
    const response = await ask<WhyIsThisHereExplanation>(prompt, { token });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get response from Bob');
    }
    if (token.isCancellationRequested) {throw new Error('Operation cancelled');}

    progress.report({ message: 'Validating response...', increment: 20 });
    return validateResponse(response.data, validateExplanation);
  }

  private getSurroundingContext(
    document: vscode.TextDocument,
    range: vscode.Range,
    contextLines: number
  ): string {
    const startLine = Math.max(0, range.start.line - contextLines);
    const endLine = Math.min(document.lineCount - 1, range.end.line + contextLines);

    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      const isTarget = i >= range.start.line && i <= range.end.line;
      const prefix = isTarget ? '>>> ' : '    ';
      lines.push(`${prefix}${i + 1}: ${document.lineAt(i).text}`);
    }
    return lines.join('\n');
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export function formatExplanationMarkdown(
  explanation: WhyIsThisHereExplanation,
  filePath: string,
  lineNumber: number | string,
  lineContent: string
): string {
  const confidenceEmoji = { high: '🟢', medium: '🟡', low: '🔴' } as const;
  const parts: string[] = [];

  parts.push(`# Why Is This Here?\n`);
  parts.push(`**File:** \`${filePath}\` · **Line:** ${lineNumber}\n`);
  parts.push('```');
  parts.push(lineContent);
  parts.push('```\n');

  if (explanation.summary) {
    parts.push(`**Summary:** ${explanation.summary}\n`);
  }
  if (explanation.businessReason) {
    parts.push(`## Business Reason\n\n${explanation.businessReason}\n`);
  }
  if (explanation.technicalContext) {
    parts.push(`## Technical Context\n\n${explanation.technicalContext}\n`);
  }
  if (explanation.relatedChanges && explanation.relatedChanges.length > 0) {
    parts.push(`## Related Changes\n`);
    for (const change of explanation.relatedChanges) {
      const loc = change.location ? ` (${change.location})` : '';
      const sha = change.commit ? ` \`${change.commit.substring(0, 7)}\`` : '';
      parts.push(`- ${change.description}${loc}${sha}`);
    }
    parts.push('');
  }
  if (explanation.relatedCommits && explanation.relatedCommits.length > 0) {
    parts.push(`## Related Commits\n`);
    for (const commit of explanation.relatedCommits) {
      parts.push(`- \`${commit.hash.substring(0, 7)}\` ${commit.message}`);
      if (commit.relevance) {
        parts.push(`  - *${commit.relevance}*`);
      }
    }
    parts.push('');
  }
  if (explanation.notes) {
    parts.push(`## Notes\n\n${explanation.notes}\n`);
  }
  parts.push(`---\n`);
  parts.push(`*Confidence: ${confidenceEmoji[explanation.confidence]} ${explanation.confidence}*`);

  return parts.join('\n');
}
