import { OnboardingPlan, PlanConfig } from './schema';

/**
 * Context object passed to the Day-N Plan prompt
 */
export interface DayNPlanContext {
  repositoryPath: string;
  repositoryName: string;
  fileTree: string;
  config: PlanConfig;
  customTemplate?: string;
  repoXRayData?: {
    entryPoints?: string;
    architectureDiagram?: string;
    criticalPath?: string;
    conventions?: string;
    technicalStack?: string[];
  };
}

/**
 * Builds the prompt for generating a personalized 5-day onboarding plan
 * 
 * The plan emphasizes progression:
 * - Day 1: High-level overview and orientation
 * - Day 2-3: Deep dives into specific areas
 * - Day 4: Integration and understanding connections
 * - Day 5: Real contribution with a starter task
 */
export function buildDayNPlanPrompt(context: DayNPlanContext): string {
  const { repositoryName, repositoryPath, fileTree, config, repoXRayData, customTemplate } = context;
  
  const repoXRaySection = repoXRayData ? `
<repository_analysis>
${repoXRayData.entryPoints ? `Entry Points:\n${repoXRayData.entryPoints}\n` : ''}
${repoXRayData.architectureDiagram ? `Architecture:\n${repoXRayData.architectureDiagram}\n` : ''}
${repoXRayData.criticalPath ? `Critical Path:\n${repoXRayData.criticalPath}\n` : ''}
${repoXRayData.conventions ? `Conventions:\n${repoXRayData.conventions}\n` : ''}
${repoXRayData.technicalStack ? `Tech Stack: ${repoXRayData.technicalStack.join(', ')}\n` : ''}
</repository_analysis>
` : '';

  const planStructure = customTemplate ? `
<plan_structure>
The user has provided a custom template for the 5-day plan. Please adapt the following template structure to the provided codebase:
${customTemplate}
</plan_structure>
` : `
<plan_structure>
Create a 5-day plan with clear progression:

**Day 1: Orientation & Overview**
- Goal: Get the big picture
- Reading: High-level docs, README, architecture overview
- Task: Simple, low-risk task (e.g., fix typo, update docs, add test)
- Estimated time: 2-3 hours of reading, 1-2 hours for task

**Day 2: Deep Dive - Core Domain**
- Goal: Understand the core business logic and main workflows
- Reading: Entry points, main services/controllers, core models
- Task: Trace a request through the system, document findings
- Estimated time: 3-4 hours of reading, 2-3 hours for task

**Day 3: Deep Dive - ${config.focusArea || 'Role-Specific Area'}**
- Goal: Master the area most relevant to their role
- Reading: Files specific to their role (${config.role})
- Task: Small feature or bug fix in their focus area
- Estimated time: 2-3 hours of reading, 3-4 hours for task

**Day 4: Integration & Patterns**
- Goal: Understand how pieces connect and coding conventions
- Reading: Utility files, shared components, test patterns, conventions
- Task: Refactor or improve existing code following conventions
- Estimated time: 2-3 hours of reading, 3-4 hours for task

**Day 5: Real Contribution**
- Goal: Make a meaningful contribution to the codebase
- Reading: Related to their first real task
- Task: Implement a small feature or fix a real bug from backlog
- Estimated time: 1-2 hours of reading, 4-6 hours for task

</plan_structure>
`;

  return `<role>
You are a senior engineering manager and technical mentor creating a personalized 5-day onboarding plan for a new team member.
</role>

<task>
Create a comprehensive, actionable 5-day onboarding plan for a new ${config.role} joining the team.

<new_team_member>
Role: ${config.role}
Seniority: ${config.seniority}
${config.focusArea ? `Focus Area: ${config.focusArea}` : ''}
</new_team_member>

<repository>
Name: ${repositoryName}
Path: ${repositoryPath}

File Tree:
${fileTree}
${repoXRaySection}
</repository>

${planStructure}

<guidelines>
1. **Tailor to seniority:**
   - Junior: More guidance, simpler tasks, more reading time
   - Mid: Balanced approach, moderate complexity
   - Senior: Less hand-holding, complex tasks, faster pace

2. **Tailor to role:**
   - Backend: Focus on APIs, services, data models, business logic
   - Frontend: Focus on components, state management, UI patterns
   - Full-stack: Balance between frontend and backend
   - DevOps: Focus on infrastructure, deployment, CI/CD
   - QA: Focus on test patterns, test infrastructure

3. **Make it actionable:**
   - Provide specific file paths to read
   - Give clear task descriptions with acceptance criteria
   - Include realistic time estimates
   - Add helpful tips for each day

4. **Ensure progression:**
   - Day 1 should be gentle and welcoming
   - Each day should build on previous days
   - Day 5 should feel like a real contribution
   - Tasks should increase in complexity and impact

5. **Be realistic:**
   - Don't overload any single day
   - Account for setup time, questions, breaks
   - Total daily time should be 6-8 hours max
   - Leave room for team interactions and meetings

6. **Provide context:**
   - Explain WHY they're reading each file
   - Connect tasks to real-world scenarios
   - Highlight what success looks like
</guidelines>

Your task:
1. Analyze the repository structure and available information
2. Create a personalized 5-day plan following the structure above
3. Select specific files for reading lists (use actual paths from file tree)
4. Design tasks that are achievable and valuable
5. Provide an overview and next steps after the 5 days
6. Add helpful tips for each day

Focus on creating a plan that makes the new team member feel productive, confident, and integrated by day 5.
</task>

<output_format>
CRITICAL: Return ONLY a valid JSON object. Do not include any markdown formatting, code blocks, or explanatory text.
Return ONLY this JSON structure:
{
  "role": "${config.role}",
  "seniority": "${config.seniority}",
  "focusArea": "${config.focusArea || ''}",
  "overview": "High-level overview of what this 5-day plan will accomplish and why it's structured this way",
  "days": [
    {
      "day": 1,
      "concept": "Orientation & Overview",
      "goal": "What the person should achieve by end of day",
      "readingList": [
        {
          "filePath": "path/to/file.md",
          "description": "Why read this file and what to learn",
          "estimatedMinutes": 30,
          "priority": "high"
        }
      ],
      "task": {
        "title": "Task title",
        "description": "Detailed description with acceptance criteria",
        "starterFile": "path/to/file.py",
        "estimatedMinutes": 120,
        "difficulty": "beginner"
      },
      "tips": [
        "Helpful tip for this day",
        "Another tip"
      ]
    }
  ],
  "nextSteps": [
    "What to do after completing the 5-day plan",
    "How to continue learning and contributing"
  ]
}

IMPORTANT: 
- Your response must start with { and end with }. No other text before or after.
- Include exactly 5 days in the "days" array
- Use actual file paths from the provided file tree
- Make reading lists comprehensive but not overwhelming (3-6 items per day)
- Ensure tasks are specific and actionable
- Adjust complexity based on seniority level
</output_format>`;
}

/**
 * Helper function to build context for Day-N Plan generation
 */
export function buildDayNPlanContext(
  repositoryPath: string,
  fileTree: string,
  config: PlanConfig,
  repoXRayData?: {
    entryPoints?: string;
    architectureDiagram?: string;
    criticalPath?: string;
    conventions?: string;
    technicalStack?: string[];
  },
  customTemplate?: string
): DayNPlanContext {
  const repositoryName = repositoryPath.split(/[/\\]/).pop() || 'unknown';
  
  return {
    repositoryPath,
    repositoryName,
    fileTree,
    config,
    customTemplate,
    repoXRayData,
  };
}
