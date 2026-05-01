import * as vscode from 'vscode';
import { StarterTasksResponse, StarterTask } from './schema';

/**
 * Renders a single starter task as a markdown card
 */
export function renderTaskCard(task: StarterTask, index: number, total: number): string {
  const parts: string[] = [];

  parts.push(`# 🚀 Task ${index + 1}/${total}: ${task.title}`);
  parts.push('');
  parts.push(`**Difficulty:** ${formatDifficulty(task.difficulty)}`);
  
  // Create a clickable link for VS Code
  // Since cards are in ONBOARD_TASKS/, we need to go up one level then to the file
  parts.push(`**Location:** [${task.file}:${task.line}](../${task.file}#L${task.line})`);
  parts.push('');
  parts.push('## 📝 Description');
  parts.push(task.description);
  parts.push('');
  parts.push('## 🎯 Expected Outcome');
  parts.push(task.expected_outcome);
  parts.push('');
  parts.push('## 💡 Hints');
  parts.push('<details>');
  parts.push('<summary>Click to reveal hints</summary>');
  parts.push('');
  task.hints.forEach(hint => {
    parts.push(`- ${hint}`);
  });
  parts.push('');
  parts.push('</details>');
  parts.push('');
  parts.push('---');
  parts.push('');
  parts.push('### ✅ Completion');
  parts.push('- [ ] I have completed this task');
  parts.push('');
  parts.push(`*Tip: Use the "Why Is This Here?" command on line ${task.line} of \`${task.file}\` for more context!*`);

  return parts.join('\n');
}

/**
 * Renders a summary of all starter tasks
 */
export function renderStarterTasksSummary(response: StarterTasksResponse): string {
  const parts: string[] = [];

  parts.push('# 🚀 Recommended Starter Tasks');
  parts.push('');
  parts.push(response.analysis_summary);
  parts.push('');

  if (response.tasks.length === 0) {
    parts.push('No suitable starter tasks were identified at this time.');
    return parts.join('\n');
  }

  parts.push('I have generated the following task cards in your `ONBOARD_TASKS` folder:');
  parts.push('');

  response.tasks.forEach((task, index) => {
    parts.push(`### ${index + 1}. ${task.title}`);
    parts.push(`- **File:** \`${task.file}\``);
    parts.push(`- **Difficulty:** ${formatDifficulty(task.difficulty)}`);
    parts.push('');
  });

  parts.push('');
  parts.push('---');
  parts.push('*Click on a task file in the explorer to start!*');

  return parts.join('\n');
}

function formatDifficulty(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'easy': return '🟢 Easy';
    case 'medium': return '🟡 Medium';
    case 'hard': return '🔴 Hard';
    default: return difficulty;
  }
}
