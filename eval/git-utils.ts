import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

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
  line: number,
  repoRoot: string
): Promise<GitLog[]> {
  try {
    // Get relative path from repo root
    const relativePath = path.relative(repoRoot, file);
    
    // Use git log -L to get line-specific history
    // Format: hash|author|date|message
    const command = `git log -L ${line},${line}:"${relativePath}" --pretty=format:"%H|%an|%ai|%s" --no-patch`;
    
    const { stdout } = await execAsync(command, {
      cwd: repoRoot,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    });

    if (!stdout.trim()) {
      return [];
    }

    // Parse the output
    const logs: GitLog[] = [];
    const lines = stdout.trim().split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const [hash, author, dateStr, ...messageParts] = line.split('|');
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
export async function getCommitDetails(
  hash: string,
  repoRoot: string
): Promise<CommitDetails | null> {
  try {
    // Get commit details with custom format
    // Format: hash|author|email|date|subject|body
    const command = `git show ${hash} --pretty=format:"%H|%an|%ae|%ai|%s|%b" --name-only --no-patch`;
    
    const { stdout } = await execAsync(command, {
      cwd: repoRoot,
      maxBuffer: 1024 * 1024 * 10,
    });

    if (!stdout.trim()) {
      return null;
    }

    const lines = stdout.trim().split('\n');
    const firstLine = lines[0];
    
    const [hash_out, author, email, dateStr, subject, ...bodyParts] = firstLine.split('|');
    
    // Files are listed after the commit info (separated by empty line)
    const emptyLineIndex = lines.findIndex((line, idx) => idx > 0 && !line.trim());
    const files = emptyLineIndex > 0 
      ? lines.slice(emptyLineIndex + 1).filter(f => f.trim())
      : [];

    return {
      hash: hash_out?.trim() || hash,
      author: author?.trim() || '',
      authorEmail: email?.trim() || '',
      date: new Date(dateStr?.trim() || ''),
      message: subject?.trim() || '',
      body: bodyParts.join('|').trim(),
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
export async function getLinkedPRs(
  hash: string,
  repoRoot: string
): Promise<PR[]> {
  try {
    const commitDetails = await getCommitDetails(hash, repoRoot);
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
      url: undefined,
      title: undefined,
      state: undefined,
    }));

    // Try to get GitHub remote URL to construct PR URLs
    try {
      const { stdout: remoteUrl } = await execAsync(
        'git config --get remote.origin.url',
        { cwd: repoRoot }
      );

      const githubMatch = remoteUrl.match(/github\.com[:/]([^\/]+)\/([^\/\s]+?)(\.git)?$/);
      if (githubMatch) {
        const [, owner, repo] = githubMatch;
        
        // Add GitHub URLs to PRs
        prs.forEach(pr => {
          pr.url = `https://github.com/${owner}/${repo}/pull/${pr.number}`;
        });
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
