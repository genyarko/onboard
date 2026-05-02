import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as https from 'https';

const execFileAsync = promisify(execFile);

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  url: string;
}

export async function getOpenGitHubIssues(workspaceRoot: string): Promise<GitHubIssue[]> {
  try {
    const { stdout: remoteUrl } = await execFileAsync('git', ['config', '--get', 'remote.origin.url'], {
      cwd: workspaceRoot,
    });

    const githubMatch = remoteUrl.match(/github\.com[:/]([^\/]+)\/([^\/\s]+?)(\.git)?$/);
    if (!githubMatch) {
      return [];
    }

    const [, owner, repo] = githubMatch;
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/issues?state=open&per_page=10`,
        method: 'GET',
        headers: {
          'User-Agent': 'Onboard-Extension'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const issues = JSON.parse(data);
              // Filter out PRs
              const result = issues
                .filter((i: any) => !i.pull_request)
                .map((i: any) => ({
                  number: i.number,
                  title: i.title,
                  body: i.body || '',
                  url: i.html_url
                }));
              resolve(result);
            } catch (e) {
              resolve([]);
            }
          } else {
            resolve([]);
          }
        });
      });

      req.on('error', () => resolve([]));
      req.end();
    });
  } catch (error) {
    return [];
  }
}
