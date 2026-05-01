import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitLog {
  hash: string;
  author: string;
  date: Date;
  message: string;
  diff?: string;
}

export interface CommitDetails {
  hash: string;
  author: string;
  authorEmail: string;
  date: Date;
  message: string;
  body: string;
  files: string[];
}

export interface PR {
  number: number;
  title?: string;
  url?: string;
  state?: string;
}

/**
 * Get git history for a specific line in a file
 * Uses git log -L to track line-specific changes
 */
export async function getLineHistory(
  file: string,
  line: number
): Promise<GitLog[]> {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder found');
    }

    // Get relative path from workspace root
    const relativePath = vscode.workspace.asRelativePath(file);
    
    // Bounded to last 5 revisions and follows renames; --no-patch keeps output small
    const command = `git log -L ${line},${line}:"${relativePath}" -n 5 --pretty=format:"%H|%an|%ai|%s" --no-patch`;

    const { stdout } = await execAsync(command, {
      cwd: workspaceFolder.uri.fsPath,
      maxBuffer: 1024 * 1024 * 2,
      timeout: 5000,
    });

    if (!stdout.trim()) {
      return [];
    }

    const logs: GitLog[] = [];
    for (const row of stdout.trim().split('\n')) {
      if (!row.trim()) continue;
      const [hash, author, dateStr, ...messageParts] = row.split('|');
      if (!hash || !author || !dateStr) continue;

      logs.push({
        hash: hash.trim(),
        author: author.trim(),
        date: new Date(dateStr.trim()),
        message: messageParts.join('|').trim(),
      });
    }

    return logs;
  } catch (error) {
    console.error('Error getting line history:', error);
    return [];
  }
}

/**
 * Get detailed information about a specific commit
 */
export async function getCommitDetails(hash: string): Promise<CommitDetails | null> {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder found');
    }

    // Sentinel-delimited fields so multi-line commit bodies don't corrupt parsing.
    const SEP = '<<<ONBOARD_FIELD>>>';
    const END = '<<<ONBOARD_END>>>';
    const format = ['%H', '%an', '%ae', '%ai', '%s', '%b'].join(SEP) + END;

    const { stdout: metaOut } = await execAsync(
      `git show -s --pretty=format:"${format}" ${hash}`,
      { cwd: workspaceFolder.uri.fsPath, maxBuffer: 1024 * 1024 * 2, timeout: 5000 }
    );

    const meta = metaOut.split(END)[0] ?? '';
    const [hashOut, author, email, dateStr, subject, body] = meta.split(SEP);

    // Files in a separate call — clean and unambiguous.
    const { stdout: filesOut } = await execAsync(
      `git show --name-only --pretty=format: ${hash}`,
      { cwd: workspaceFolder.uri.fsPath, maxBuffer: 1024 * 1024 * 2, timeout: 5000 }
    );
    const files = filesOut.split('\n').map(f => f.trim()).filter(Boolean);

    return {
      hash: hashOut?.trim() || hash,
      author: author?.trim() || '',
      authorEmail: email?.trim() || '',
      date: new Date(dateStr?.trim() || ''),
      message: subject?.trim() || '',
      body: (body ?? '').trim(),
      files,
    };
  } catch (error) {
    console.error('Error getting commit details:', error);
    return null;
  }
}

/**
 * Extract and fetch PR information from commit message
 * Looks for patterns like #1234, PR #1234, or GitHub PR URLs
 */
export async function getLinkedPRs(hash: string): Promise<PR[]> {
  try {
    const commitDetails = await getCommitDetails(hash);
    if (!commitDetails) {
      return [];
    }

    const fullMessage = `${commitDetails.message} ${commitDetails.body}`;
    
    // Extract PR numbers from various patterns
    const prPatterns = [
      /#(\d+)/g,                                    // #1234
      /PR\s*#?(\d+)/gi,                            // PR #1234 or PR1234
      /pull\/(\d+)/g,                              // pull/1234
      /github\.com\/[^\/]+\/[^\/]+\/pull\/(\d+)/g // Full GitHub URL
    ];

    const prNumbers = new Set<number>();
    
    for (const pattern of prPatterns) {
      let match;
      while ((match = pattern.exec(fullMessage)) !== null) {
        const prNumber = parseInt(match[1], 10);
        if (!isNaN(prNumber)) {
          prNumbers.add(prNumber);
        }
      }
    }

    // Convert to PR objects
    const prs: PR[] = Array.from(prNumbers).map(number => ({
      number,
      url: undefined, // Will be populated if we can fetch from GitHub API
      title: undefined,
      state: undefined,
    }));

    // Try to get GitHub remote URL to construct PR URLs
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        const { stdout: remoteUrl } = await execAsync(
          'git config --get remote.origin.url',
          { cwd: workspaceFolder.uri.fsPath }
        );

        const githubMatch = remoteUrl.match(/github\.com[:/]([^\/]+)\/([^\/\s]+?)(\.git)?$/);
        if (githubMatch) {
          const [, owner, repo] = githubMatch;
          
          // Add GitHub URLs to PRs
          prs.forEach(pr => {
            pr.url = `https://github.com/${owner}/${repo}/pull/${pr.number}`;
          });

          // Optionally fetch PR details from GitHub API
          // This would require authentication and is left as future enhancement
          // await fetchPRDetailsFromGitHub(owner, repo, prs);
        }
      }
    } catch (error) {
      // Silently fail if we can't get remote URL
      console.debug('Could not get GitHub remote URL:', error);
    }

    return prs;
  } catch (error) {
    console.error('Error getting linked PRs:', error);
    return [];
  }
}

/**
 * Helper function to check if current workspace is a git repository
 */
export async function isGitRepository(): Promise<boolean> {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return false;
    }

    await execAsync('git rev-parse --git-dir', {
      cwd: workspaceFolder.uri.fsPath,
    });
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current branch name
 */
export async function getCurrentBranch(): Promise<string | null> {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return null;
    }

    const { stdout } = await execAsync('git branch --show-current', {
      cwd: workspaceFolder.uri.fsPath,
    });
    
    return stdout.trim() || null;
  } catch {
    return null;
  }
}
