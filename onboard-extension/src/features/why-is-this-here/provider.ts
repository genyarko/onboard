import * as vscode from 'vscode';
import { getLineHistory, getCommitDetails, getLinkedPRs, isGitRepository } from './git';
import { generateWhyIsThisHerePrompt, generateFallbackPrompt } from './prompt';
import { validateExplanation, WhyIsThisHereExplanation } from './schema';
import { ask, validateResponse } from '../../bob/client';

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;

export class WhyIsThisHereService {
  private cache = new Map<string, { explanation: WhyIsThisHereExplanation; timestamp: number }>();

  async analyze(
    document: vscode.TextDocument,
    position: vscode.Position,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
  ): Promise<WhyIsThisHereExplanation | null> {
    const line = document.lineAt(position.line);
    const lineContent = line.text.trim();
    if (!lineContent) {
      return null;
    }

    const cacheKey = `${document.uri.fsPath}:${position.line}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.explanation;
    }

    const isGitRepo = await isGitRepository();
    const explanation = isGitRepo
      ? await this.analyzeWithGitHistory(document, position, lineContent, progress, token)
      : await this.analyzeWithoutGitHistory(document, position, lineContent, progress, token);

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
    position: vscode.Position,
    lineContent: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
  ): Promise<WhyIsThisHereExplanation> {
    progress.report({ message: 'Getting code context...', increment: 10 });
    const surroundingCode = this.getSurroundingContext(document, position.line, 30);
    if (token.isCancellationRequested) throw new Error('Operation cancelled');

    progress.report({ message: 'Fetching git history...', increment: 20 });
    const history = await getLineHistory(document.uri.fsPath, position.line + 1);
    if (token.isCancellationRequested) throw new Error('Operation cancelled');

    progress.report({ message: 'Getting commit details...', increment: 20 });
    const commitDetails = history.length > 0 ? await getCommitDetails(history[0].hash) : null;
    if (token.isCancellationRequested) throw new Error('Operation cancelled');

    progress.report({ message: 'Fetching PR details...', increment: 10 });
    const linkedPRs = history.length > 0 ? await getLinkedPRs(history[0].hash) : [];
    if (token.isCancellationRequested) throw new Error('Operation cancelled');

    progress.report({ message: 'Asking Bob...', increment: 30 });
    const prompt = generateWhyIsThisHerePrompt({
      filePath: vscode.workspace.asRelativePath(document.uri.fsPath),
      lineNumber: position.line + 1,
      lineContent,
      history,
      commitDetails: commitDetails || undefined,
      linkedPRs: linkedPRs.length > 0 ? linkedPRs : undefined,
      surroundingCode,
    });
    const response = await ask<WhyIsThisHereExplanation>(prompt);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get response from Bob');
    }
    if (token.isCancellationRequested) throw new Error('Operation cancelled');

    progress.report({ message: 'Validating response...', increment: 10 });
    return validateResponse(response.data, validateExplanation);
  }

  private async analyzeWithoutGitHistory(
    document: vscode.TextDocument,
    position: vscode.Position,
    lineContent: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
  ): Promise<WhyIsThisHereExplanation> {
    progress.report({ message: 'Getting code context...', increment: 20 });
    const surroundingCode = this.getSurroundingContext(document, position.line, 30);
    if (token.isCancellationRequested) throw new Error('Operation cancelled');

    progress.report({ message: 'Asking Bob...', increment: 50 });
    const prompt = generateFallbackPrompt(
      vscode.workspace.asRelativePath(document.uri.fsPath),
      position.line + 1,
      lineContent,
      surroundingCode
    );
    const response = await ask<WhyIsThisHereExplanation>(prompt);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get response from Bob');
    }
    if (token.isCancellationRequested) throw new Error('Operation cancelled');

    progress.report({ message: 'Validating response...', increment: 20 });
    return validateResponse(response.data, validateExplanation);
  }

  private getSurroundingContext(
    document: vscode.TextDocument,
    lineNumber: number,
    contextLines: number
  ): string {
    const startLine = Math.max(0, lineNumber - contextLines);
    const endLine = Math.min(document.lineCount - 1, lineNumber + contextLines);

    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      const prefix = i === lineNumber ? '>>> ' : '    ';
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
  lineNumber: number,
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
