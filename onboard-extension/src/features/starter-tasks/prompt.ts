/**
 * Bob prompt template for "Starter Tasks" feature
 * Scans the codebase for TODO/FIXME comments and suggests low-stakes starter tasks
 */

import { StarterTasksResponse } from './schema';

export interface SearchHit {
  filePath: string;
  lineNumber: number;
  content: string;
  surroundingCode?: string;
}

export interface StarterTasksContext {
  repositoryName: string;
  repositoryPath: string;
  fileTree: string;
  searchHits: SearchHit[];
  techStack?: string[];
}

/**
 * Builds the prompt for Bob to analyze TODOs and suggest starter tasks
 */
export function buildStarterTasksPrompt(context: StarterTasksContext): string {
  const { repositoryName, repositoryPath, fileTree, searchHits, techStack } = context;

  const searchHitsSection = searchHits.length > 0 ? `
<found_comments>
${searchHits.map((hit, index) => `
[${index + 1}] ${hit.filePath}:${hit.lineNumber}
Content: ${hit.content.trim()}
${hit.surroundingCode ? `Context:\n\`\`\`\n${hit.surroundingCode}\n\`\`\`` : ''}
`).join('\n')}
</found_comments>
` : '<found_comments>No TODO or FIXME comments were found in the recent scan.</found_comments>';

  return `<role>
You are a senior technical mentor helping a new developer find their first contribution to the ${repositoryName} project.
</role>

<task>
Analyze the provided TODO/FIXME comments and the repository structure to identify the top 3 best "starter tasks" for a newcomer.

A good starter task is:
1. **Low stakes**: Doesn't involve critical business logic or breaking changes.
2. **Local**: Can be completed by modifying one or two files.
3. **Clear**: Has a well-defined problem and expected outcome.
4. **Instructive**: Helps the developer learn about a specific part of the codebase or a convention.

<repository_context>
Name: ${repositoryName}
Path: ${repositoryPath}
${techStack ? `Tech Stack: ${techStack.join(', ')}` : ''}

File Tree Summary:
${fileTree}
</repository_context>

${searchHitsSection}

<guidelines>
1. **Filter and Prioritize**: Review the found comments. Some might be too complex or outdated. Select the 3 most suitable ones.
2. **Enrich**: For each selected task, provide a better title and description than just the comment text.
3. **Contextualize**: Explain WHY this task is a good starter and what they will learn.
4. **Hints**: Provide 2-3 specific hints (e.g., "Look at how X is implemented in Y", "You might need to use the Z utility").
5. **Expected Outcome**: Clearly define what "done" looks like for this task.
6. **Difficulty**: Label tasks as 'easy', 'medium', or 'hard' based on the complexity of the repo and the specific task.
</guidelines>

<output_format>
Return ONLY a valid JSON object matching the following structure:
{
  "tasks": [
    {
      "title": "Clear and encouraging title",
      "description": "Detailed explanation of the task and its value",
      "file": "relative/path/to/file",
      "line": 123,
      "hints": ["Hint 1", "Hint 2"],
      "expected_outcome": "Description of the final state",
      "difficulty": "easy|medium|hard"
    }
  ],
  "analysis_summary": "Brief summary of how you selected these tasks from the available context"
}
</output_format>
</task>`;
}
