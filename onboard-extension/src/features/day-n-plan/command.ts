import { Logger } from '../../utils/logger';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ask, validateResponse } from '../../bob/client';
import { getPlanConfiguration } from './config';
import { buildDayNPlanPrompt, buildDayNPlanContext } from './prompt';
import { generateFileTree } from '../../utils/file-tree';
import { OnboardingPlanSchema, OnboardingPlan } from './schema';
import { DayNPlanProvider } from './provider';

/**
 * Execute the Day-N Plan command
 * Generates a personalized 5-day onboarding plan
 */
export async function executeDayNPlan(provider: DayNPlanProvider): Promise<void> {
  try {
    // Get workspace root path
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder is open. Please open a folder first.');
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const workspaceName = path.basename(workspaceRoot);

    // Step 1: Collect configuration from user
    const config = await getPlanConfiguration();
    if (!config) {
      // User cancelled
      return;
    }

    // Show progress notification
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Generating 5-day plan for ${config.role}...`,
        cancellable: true,
      },
      async (progress, token) => {
        try {
          // Step 2: Gather repository context
          progress.report({ message: 'Analyzing repository structure...', increment: 20 });
          const fileTree = await generateFileTree(workspaceRoot);
          if (token.isCancellationRequested) {return;}

          // Step 3: Check for existing Repo X-Ray data
          progress.report({ message: 'Checking for repository analysis...', increment: 30 });
          const repoXRayData = await loadRepoXRayData(workspaceRoot);
          if (token.isCancellationRequested) {return;}

          // Step 4: Build context and prompt
          progress.report({ message: 'Building onboarding plan...', increment: 40 });
          
          let customTemplate: string | undefined;
          try {
            const templatePath = path.join(workspaceRoot, '.onboard', 'template.md');
            customTemplate = await fs.readFile(templatePath, 'utf-8');
          } catch (e) {
            // Ignore if template doesn't exist
          }

          const context = buildDayNPlanContext(workspaceRoot, fileTree, config, repoXRayData, customTemplate);
          const prompt = buildDayNPlanPrompt(context);
          if (token.isCancellationRequested) {return;}

          // Step 5: Call Bob to generate plan
          progress.report({ message: 'Generating personalized plan...', increment: 60 });
          const response = await ask(prompt, { token });

          if (!response.success || !response.data) {
            throw new Error(`Failed to generate plan: ${response.error || 'No data returned'}`);
          }

          // Step 6: Validate response
          progress.report({ message: 'Validating plan structure...', increment: 80 });
          const plan = validateResponse(response.data, (data) => OnboardingPlanSchema.parse(data));

          // Step 7: Update tree view
          progress.report({ message: 'Updating tree view...', increment: 90 });
          provider.updatePlan(plan);

          // Step 8: Save plan to file (optional)
          progress.report({ message: 'Saving plan...', increment: 95 });
          await savePlanToFile(plan, workspaceRoot);

          // Step 9: Show success message
          progress.report({ message: 'Complete!', increment: 100 });
          
          const viewPlan = await vscode.window.showInformationMessage(
            `✅ 5-day onboarding plan generated for ${config.role}!`,
            'View Plan',
            'View in Tree'
          );

          if (viewPlan === 'View Plan') {
            const planPath = path.join(workspaceRoot, 'ONBOARDING_PLAN.md');
            const doc = await vscode.workspace.openTextDocument(planPath);
            await vscode.window.showTextDocument(doc);
          } else if (viewPlan === 'View in Tree') {
            await vscode.commands.executeCommand('onboard.dayNPlan.focus');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Day-N Plan generation failed: ${errorMessage}`);
          throw error;
        }
      }
    );
  } catch (error) {
    Logger.error('Day-N Plan error:', error);
  }
}


export async function exportDayNPlanIcs(provider: DayNPlanProvider): Promise<void> {
  const plan = provider.getPlan();
  if (!plan) {
    vscode.window.showErrorMessage('No Day-N Plan to export. Generate a plan first.');
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {return;}
  const workspaceRoot = workspaceFolders[0].uri.fsPath;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Onboard Extension//Day-N Plan//EN'
  ];

  const now = new Date();
  // Assume starting next Monday
  let startDate = new Date(now);
  startDate.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
  startDate.setHours(9, 0, 0, 0);

  const formatIcsDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  plan.days.forEach((day, index) => {
    const eventStart = new Date(startDate);
    eventStart.setDate(startDate.getDate() + index);
    const eventEnd = new Date(eventStart);
    eventEnd.setHours(17, 0, 0, 0); // 5 PM

    const uid = `onboard-day-${day.day}-${now.getTime()}@onboard`;
    const dtstamp = formatIcsDate(now);
    const dtstart = formatIcsDate(eventStart);
    const dtend = formatIcsDate(eventEnd);

    const description = `Goal: ${day.goal}\\n\\nTask: ${day.task.title}\\n${day.task.description}\\n\\nReadings:\\n${day.readingList.map(r => '- ' + r.filePath).join('\\n')}`;

    icsLines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:Onboarding Day ${day.day}: ${day.concept}`,
      `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
      'END:VEVENT'
    );
  });

  icsLines.push('END:VCALENDAR');

  const filePath = path.join(workspaceRoot, 'ONBOARDING_PLAN.ics');
  await fs.writeFile(filePath, icsLines.join('\r\n'), 'utf-8');
  
  vscode.window.showInformationMessage(`Exported plan to ${filePath}`, 'Open File').then(choice => {
    if (choice === 'Open File') {
      vscode.workspace.openTextDocument(filePath).then(doc => {
        vscode.window.showTextDocument(doc);
      });
    }
  });
}
async function loadRepoXRayData(workspaceRoot: string): Promise<any> {
  try {
    const xrayPath = path.join(workspaceRoot, 'REPO_XRAY.md');
    const content = await fs.readFile(xrayPath, 'utf-8');

    // Parse markdown to extract key sections
    const data: any = {};

    // Extract entry points
    const entryPointsMatch = content.match(/## 🚪 Entry Points\n\n([\s\S]*?)(?=\n## |\n---|\n\*\*|$)/);
    if (entryPointsMatch) {
      data.entryPoints = entryPointsMatch[1].trim();
    }

    // Extract architecture diagram
    const archMatch = content.match(/## 🏗️ Architecture Diagram\n\n```mermaid\n([\s\S]*?)```/);
    if (archMatch) {
      data.architectureDiagram = archMatch[1].trim();
    }

    // Extract critical path
    const criticalMatch = content.match(/## 🎯 Critical Path\n\n([\s\S]*?)(?=\n## |\n---|\n\*\*|$)/);
    if (criticalMatch) {
      data.criticalPath = criticalMatch[1].trim();
    }

    // Extract conventions
    const conventionsMatch = content.match(/## 📋 Conventions\n\n([\s\S]*?)(?=\n## |\n---|\n\*\*|$)/);
    if (conventionsMatch) {
      data.conventions = conventionsMatch[1].trim();
    }

    // Extract tech stack
    const techStackMatch = content.match(/\*\*Tech Stack:\*\* (.*)/);
    if (techStackMatch) {
      data.technicalStack = techStackMatch[1].split(',').map((s) => s.trim());
    }

    return Object.keys(data).length > 0 ? data : undefined;
  } catch (error) {
    // Repo X-Ray data not available, continue without it
    return undefined;
  }
}

/**
 * Save the plan to a markdown file
 */
async function savePlanToFile(plan: OnboardingPlan, workspaceRoot: string): Promise<void> {
  const markdown = generatePlanMarkdown(plan);
  const filePath = path.join(workspaceRoot, 'ONBOARDING_PLAN.md');
  await fs.writeFile(filePath, markdown, 'utf-8');
}

/**
 * Generate markdown representation of the plan
 */
function generatePlanMarkdown(plan: OnboardingPlan): string {
  const lines: string[] = [];

  // Header
  lines.push(`# 5-Day Onboarding Plan`);
  lines.push('');
  lines.push(`**Role:** ${plan.role}`);
  lines.push(`**Seniority:** ${plan.seniority}`);
  if (plan.focusArea) {
    lines.push(`**Focus Area:** ${plan.focusArea}`);
  }
  lines.push('');
  lines.push(`**Generated:** ${new Date().toLocaleDateString()}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Overview
  lines.push('## 📋 Overview');
  lines.push('');
  lines.push(plan.overview);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Days
  plan.days.forEach((day) => {
    lines.push(`## Day ${day.day}: ${day.concept}`);
    lines.push('');
    lines.push(`**Goal:** ${day.goal}`);
    lines.push('');

    // Reading List
    lines.push('### 📚 Reading List');
    lines.push('');
    day.readingList.forEach((reading) => {
      const priorityIcon = reading.priority === 'high' ? '🔴' : reading.priority === 'medium' ? '🟡' : '🟢';
      lines.push(`- ${priorityIcon} **${reading.filePath}** (${reading.estimatedMinutes} min)`);
      lines.push(`  - ${reading.description}`);
    });
    lines.push('');

    // Task
    lines.push('### ✅ Task');
    lines.push('');
    lines.push(`**${day.task.title}**`);
    lines.push('');
    lines.push(day.task.description);
    lines.push('');
    lines.push(`- **Estimated Time:** ${day.task.estimatedMinutes} minutes`);
    lines.push(`- **Difficulty:** ${day.task.difficulty}`);
    if (day.task.starterFile) {
      lines.push(`- **Starter File:** \`${day.task.starterFile}\``);
    }
    if (day.task.starterTask) {
      lines.push(`- **Starter Task:** ${day.task.starterTask}`);
    }
    lines.push('');

    // Tips
    if (day.tips && day.tips.length > 0) {
      lines.push('### 💡 Tips');
      lines.push('');
      day.tips.forEach((tip) => {
        lines.push(`- ${tip}`);
      });
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  });

  // Next Steps
  lines.push('## 🚀 Next Steps');
  lines.push('');
  plan.nextSteps.forEach((step) => {
    lines.push(`- ${step}`);
  });
  lines.push('');

  return lines.join('\n');
}