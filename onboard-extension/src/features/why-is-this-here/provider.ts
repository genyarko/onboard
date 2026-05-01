import * as vscode from 'vscode';
import { getLineHistory, getCommitDetails, getLinkedPRs, isGitRepository } from './git';
import { generateWhyIsThisHerePrompt, generateFallbackPrompt } from './prompt';
import { validateExplanation, WhyIsThisHereExplanation } from './schema';
import { ask, validateResponse } from '../../bob/client';

/**
 * Hover provider for "Why Is This Here" feature
 * Shows git history and context for code lines
 */
export class WhyIsThisHereProvider implements vscode.HoverProvider {
  private cache: Map<string, { explanation: WhyIsThisHereExplanation; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | null> {
    try {
      // Check if we're in a git repository
      const isGitRepo = await isGitRepository();
      
      // Get the current line
      const line = document.lineAt(position.line);
      const lineContent = line.text.trim();
      
      // Skip empty lines or lines with only whitespace
      if (!lineContent) {
        return null;
      }

      // Create cache key
      const cacheKey = `${document.uri.fsPath}:${position.line}:${lineContent}`;
      
      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return this.formatHover(cached.explanation);
      }

      // Show progress indicator
      return vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Analyzing code context...',
          cancellable: true,
        },
        async (progress, progressToken) => {
          // Check for cancellation
          if (token.isCancellationRequested || progressToken.isCancellationRequested) {
            return null;
          }

          let explanation: WhyIsThisHereExplanation;

          if (isGitRepo) {
            // Git repository - full analysis with history
            explanation = await this.analyzeWithGitHistory(
              document,
              position,
              lineContent,
              progress,
              progressToken
            );
          } else {
            // No git repository - fallback to code analysis only
            explanation = await this.analyzeWithoutGitHistory(
              document,
              position,
              lineContent,
              progress,
              progressToken
            );
          }

          // Check for cancellation before caching
          if (token.isCancellationRequested || progressToken.isCancellationRequested) {
            return null;
          }

          // Cache the result
          this.cache.set(cacheKey, {
            explanation,
            timestamp: Date.now(),
          });

          return this.formatHover(explanation);
        }
      );
    } catch (error) {
      console.error('Error in WhyIsThisHereProvider:', error);
      
      // Show error message to user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return new vscode.Hover(
        new vscode.MarkdownString(`**Error analyzing code:**\n\n${errorMessage}`)
      );
    }
  }

  /**
   * Analyze code with git history
   */
  private async analyzeWithGitHistory(
    document: vscode.TextDocument,
    position: vscode.Position,
    lineContent: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
  ): Promise<WhyIsThisHereExplanation> {
    // Step 1: Get surrounding context (±30 lines)
    progress.report({ message: 'Getting code context...', increment: 10 });
    const surroundingCode = this.getSurroundingContext(document, position.line, 30);

    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }

    // Step 2: Fetch git history for this line
    progress.report({ message: 'Fetching git history...', increment: 20 });
    const history = await getLineHistory(document.uri.fsPath, position.line + 1); // Git uses 1-based line numbers

    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }

    // Step 3: Get commit details for the most recent commit
    progress.report({ message: 'Getting commit details...', increment: 30 });
    let commitDetails = null;
    if (history.length > 0) {
      commitDetails = await getCommitDetails(history[0].hash);
    }

    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }

    // Step 4: Fetch linked PR/issue details
    progress.report({ message: 'Fetching PR details...', increment: 40 });
    let linkedPRs = [];
    if (history.length > 0) {
      linkedPRs = await getLinkedPRs(history[0].hash);
    }

    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }

    // Step 5: Build context object and generate prompt
    progress.report({ message: 'Building context...', increment: 50 });
    const prompt = generateWhyIsThisHerePrompt({
      filePath: vscode.workspace.asRelativePath(document.uri.fsPath),
      lineNumber: position.line + 1,
      lineContent,
      history,
      commitDetails: commitDetails || undefined,
      linkedPRs: linkedPRs.length > 0 ? linkedPRs : undefined,
      surroundingCode,
    });

    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }

    // Step 6: Call Bob with prompt
    progress.report({ message: 'Asking Bob...', increment: 60 });
    const response = await ask<WhyIsThisHereExplanation>(prompt);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get response from Bob');
    }

    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }

    // Step 7: Validate response
    progress.report({ message: 'Validating response...', increment: 80 });
    const validatedExplanation = validateResponse(response.data, validateExplanation);

    progress.report({ message: 'Done!', increment: 100 });
    return validatedExplanation;
  }

  /**
   * Analyze code without git history (fallback)
   */
  private async analyzeWithoutGitHistory(
    document: vscode.TextDocument,
    position: vscode.Position,
    lineContent: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
  ): Promise<WhyIsThisHereExplanation> {
    // Get surrounding context
    progress.report({ message: 'Getting code context...', increment: 20 });
    const surroundingCode = this.getSurroundingContext(document, position.line, 30);

    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }

    // Generate fallback prompt
    progress.report({ message: 'Building context...', increment: 40 });
    const prompt = generateFallbackPrompt(
      vscode.workspace.asRelativePath(document.uri.fsPath),
      position.line + 1,
      lineContent,
      surroundingCode
    );

    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }

    // Call Bob
    progress.report({ message: 'Asking Bob...', increment: 60 });
    const response = await ask<WhyIsThisHereExplanation>(prompt);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get response from Bob');
    }

    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }

    // Validate response
    progress.report({ message: 'Validating response...', increment: 80 });
    const validatedExplanation = validateResponse(response.data, validateExplanation);

    progress.report({ message: 'Done!', increment: 100 });
    return validatedExplanation;
  }

  /**
   * Get surrounding code context (±N lines)
   */
  private getSurroundingContext(
    document: vscode.TextDocument,
    lineNumber: number,
    contextLines: number
  ): string {
    const startLine = Math.max(0, lineNumber - contextLines);
    const endLine = Math.min(document.lineCount - 1, lineNumber + contextLines);

    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      const line = document.lineAt(i);
      const prefix = i === lineNumber ? '>>> ' : '    '; // Highlight the target line
      lines.push(`${prefix}${i + 1}: ${line.text}`);
    }

    return lines.join('\n');
  }

  /**
   * Format the explanation as a hover markdown
   */
  private formatHover(explanation: WhyIsThisHereExplanation): vscode.Hover {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    markdown.supportHtml = true;

    // Title
    markdown.appendMarkdown('## 🔍 Why Is This Here?\n\n');

    // Summary
    if (explanation.summary) {
      markdown.appendMarkdown(`**Summary:** ${explanation.summary}\n\n`);
    }

    // Business Reason
    if (explanation.businessReason) {
      markdown.appendMarkdown(`### 💼 Business Reason\n\n${explanation.businessReason}\n\n`);
    }

    // Technical Context
    if (explanation.technicalContext) {
      markdown.appendMarkdown(`### ⚙️ Technical Context\n\n${explanation.technicalContext}\n\n`);
    }

    // Related Changes
    if (explanation.relatedChanges && explanation.relatedChanges.length > 0) {
      markdown.appendMarkdown('### 🔗 Related Changes\n\n');
      explanation.relatedChanges.forEach((change) => {
        markdown.appendMarkdown(`- ${change.description}`);
        if (change.location) {
          markdown.appendMarkdown(` (${change.location})`);
        }
        if (change.commit) {
          markdown.appendMarkdown(` \`${change.commit.substring(0, 7)}\``);
        }
        markdown.appendMarkdown('\n');
      });
      markdown.appendMarkdown('\n');
    }

    // Related Commits
    if (explanation.relatedCommits && explanation.relatedCommits.length > 0) {
      markdown.appendMarkdown('### 📝 Related Commits\n\n');
      explanation.relatedCommits.forEach((commit) => {
        markdown.appendMarkdown(`- \`${commit.hash.substring(0, 7)}\` ${commit.message}\n`);
        if (commit.relevance) {
          markdown.appendMarkdown(`  - *${commit.relevance}*\n`);
        }
      });
      markdown.appendMarkdown('\n');
    }

    // Notes
    if (explanation.notes) {
      markdown.appendMarkdown(`### 📌 Notes\n\n${explanation.notes}\n\n`);
    }

    // Confidence indicator
    const confidenceEmoji = {
      high: '🟢',
      medium: '🟡',
      low: '🔴',
    };
    markdown.appendMarkdown(
      `---\n\n*Confidence: ${confidenceEmoji[explanation.confidence]} ${explanation.confidence}*`
    );

    return new vscode.Hover(markdown);
  }

  /**
   * Clear the cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Register the Why Is This Here hover provider
 */
export function registerWhyIsThisHereProvider(context: vscode.ExtensionContext): void {
  const provider = new WhyIsThisHereProvider();

  const disposable = vscode.languages.registerHoverProvider(
    { scheme: 'file' }, // Apply to all file schemes
    provider
  );

  context.subscriptions.push(disposable);

  // Add command to clear cache
  const clearCacheCommand = vscode.commands.registerCommand(
    'onboard.whyIsThisHere.clearCache',
    () => {
      provider.clearCache();
      vscode.window.showInformationMessage('Why Is This Here cache cleared');
    }
  );

  context.subscriptions.push(clearCacheCommand);
}