/**
 * Bob prompt template for "Why Is This Here" feature
 * Generates prompts to explain code context using git history
 */

import { GitLog, CommitDetails, PR } from './git';

export interface PromptContext {
  filePath: string;
  lineNumber: number;
  lineContent: string;
  history: GitLog[];
  commitDetails?: CommitDetails;
  linkedPRs?: PR[];
  surroundingCode?: string;
}

/**
 * Generate a prompt for Bob to explain why a line of code exists
 */
export function generateWhyIsThisHerePrompt(context: PromptContext): string {
  const {
    filePath,
    lineNumber,
    lineContent,
    history,
    commitDetails,
    linkedPRs,
    surroundingCode,
  } = context;

  let prompt = `# Why Is This Here - Code Context Analysis

## Code Location
- **File**: ${filePath}
- **Line**: ${lineNumber}
- **Content**: \`${lineContent.trim()}\`

`;

  // Add surrounding code if available
  if (surroundingCode) {
    prompt += `## Surrounding Code
\`\`\`
${surroundingCode}
\`\`\`

`;
  }

  // Add git history
  if (history.length > 0) {
    prompt += `## Git History
This line has been modified ${history.length} time(s):

`;
    history.forEach((log, index) => {
      prompt += `### ${index + 1}. ${log.message}
- **Author**: ${log.author}
- **Date**: ${log.date.toLocaleDateString()}
- **Commit**: ${log.hash.substring(0, 7)}

`;
    });
  }

  // Add detailed commit information
  if (commitDetails) {
    prompt += `## Most Recent Commit Details
- **Message**: ${commitDetails.message}
- **Author**: ${commitDetails.author} (${commitDetails.authorEmail})
- **Date**: ${commitDetails.date.toLocaleString()}
- **Files Changed**: ${commitDetails.files.length}

`;
    if (commitDetails.body) {
      prompt += `**Commit Body**:
${commitDetails.body}

`;
    }
  }

  // Add linked PRs
  if (linkedPRs && linkedPRs.length > 0) {
    prompt += `## Linked Pull Requests
`;
    linkedPRs.forEach(pr => {
      prompt += `- PR #${pr.number}`;
      if (pr.url) {
        prompt += ` - ${pr.url}`;
      }
      if (pr.title) {
        prompt += ` - ${pr.title}`;
      }
      if (pr.state) {
        prompt += ` (${pr.state})`;
      }
      prompt += '\n';
    });
    prompt += '\n';
  }

  // Add the actual question
  prompt += `## Task
Analyze the code and git history to explain WHY this code exists, not just WHAT it does.

Provide your response in the following JSON structure:
{
  "summary": "Brief summary of what this code does",
  "businessReason": "The business reason or problem this code solves - WHY it exists from a business perspective",
  "technicalContext": "Technical context, implementation details, and architectural decisions - connect to historical decisions from commits",
  "relatedChanges": [
    {
      "description": "Description of related change",
      "location": "File or location (optional)",
      "commit": "Commit hash (optional)"
    }
  ],
  "relatedCommits": [
    {
      "hash": "commit hash",
      "message": "commit message",
      "relevance": "How this commit relates to the explanation"
    }
  ],
  "confidence": "high|medium|low",
  "notes": "Additional observations (optional)"
}

**Key Requirements:**
1. **Focus on WHY, not WHAT**: Explain the business reason and problem being solved
2. **Connect to history**: Reference commit messages, PR information, and historical decisions
3. **Synthesize context**: Don't just describe the code - explain its purpose in the larger system
4. **Business perspective**: What business need or user requirement drove this code?
5. **Technical decisions**: What architectural or technical considerations influenced the implementation?

Please provide a clear, concise explanation that helps a developer understand the reasoning behind this code.
`;

  return prompt;
}

/**
 * Generate a simpler prompt when git history is not available
 */
export function generateFallbackPrompt(
  filePath: string,
  lineNumber: number,
  lineContent: string,
  surroundingCode?: string
): string {
  let prompt = `# Code Context Analysis (No Git History Available)

## Code Location
- **File**: ${filePath}
- **Line**: ${lineNumber}
- **Content**: \`${lineContent.trim()}\`

`;

  if (surroundingCode) {
    prompt += `## Surrounding Code
\`\`\`
${surroundingCode}
\`\`\`

`;
  }

  prompt += `## Task
Git history is not available. Infer purpose from the code alone and respond with this JSON structure:
{
  "summary": "Brief summary of what this code does",
  "businessReason": "Likely business reason or problem this code solves (inferred from code)",
  "technicalContext": "Technical decisions and implementation details visible in surrounding code",
  "confidence": "low",
  "notes": "Note that this analysis is based on code only — no git history was available."
}

Set confidence to "low" — without history, conclusions are inferred. Focus on WHY, not just WHAT.
`;

  return prompt;
}
