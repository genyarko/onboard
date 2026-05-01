import { z } from 'zod';

/**
 * Schema for a reading item in the onboarding plan
 * Represents a file or documentation that should be read
 */
export const ReadingItemSchema = z.object({
  filePath: z.string().describe('Absolute or relative path to the file to read'),
  description: z.string().describe('Brief description of what to learn from this file'),
  estimatedMinutes: z.number().describe('Estimated time to read and understand (in minutes)'),
  priority: z.enum(['high', 'medium', 'low']).describe('Priority level for this reading'),
});

export type ReadingItem = z.infer<typeof ReadingItemSchema>;

/**
 * Schema for a task in the onboarding plan
 * Represents an actionable task for the new team member
 */
export const TaskSchema = z.object({
  title: z.string().describe('Title of the task'),
  description: z.string().describe('Detailed description of what to do'),
  starterFile: z.string().optional().describe('Optional: Path to a file to start with'),
  starterTask: z.string().optional().describe('Optional: Link or reference to a starter task/issue'),
  estimatedMinutes: z.number().describe('Estimated time to complete (in minutes)'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).describe('Difficulty level'),
});

export type Task = z.infer<typeof TaskSchema>;

/**
 * Schema for a single day in the onboarding plan
 * Each day has a concept focus, reading list, and a task
 */
export const DayPlanSchema = z.object({
  day: z.number().min(1).max(5).describe('Day number (1-5)'),
  concept: z.string().describe('Main concept or theme for this day'),
  goal: z.string().describe('What the person should achieve by end of day'),
  readingList: z.array(ReadingItemSchema).describe('List of files/docs to read'),
  task: TaskSchema.describe('Hands-on task for this day'),
  tips: z.array(z.string()).optional().describe('Optional tips or advice for this day'),
});

export type DayPlan = z.infer<typeof DayPlanSchema>;

/**
 * Schema for the complete 5-day onboarding plan
 * Personalized based on role, seniority, and focus area
 */
export const OnboardingPlanSchema = z.object({
  role: z.string().describe('Role of the new team member (e.g., "Backend Engineer", "Frontend Developer")'),
  seniority: z.enum(['junior', 'mid', 'senior']).describe('Seniority level'),
  focusArea: z.string().optional().describe('Optional specific area of focus (e.g., "API development", "UI components")'),
  overview: z.string().describe('High-level overview of the 5-day plan'),
  days: z.array(DayPlanSchema).length(5).describe('Exactly 5 days of onboarding plan'),
  nextSteps: z.array(z.string()).describe('Suggested next steps after completing the 5-day plan'),
});

export type OnboardingPlan = z.infer<typeof OnboardingPlanSchema>;

/**
 * Schema for the configuration input
 * Used to collect user preferences before generating the plan
 */
export const PlanConfigSchema = z.object({
  role: z.string().describe('Selected role'),
  seniority: z.enum(['junior', 'mid', 'senior']).describe('Selected seniority level'),
  focusArea: z.string().optional().describe('Optional focus area'),
});

export type PlanConfig = z.infer<typeof PlanConfigSchema>;

/**
 * Schema for the complete Day-N Plan result
 * Includes the plan and metadata about generation
 */
export const DayNPlanResultSchema = z.object({
  plan: OnboardingPlanSchema,
  metadata: z.object({
    repositoryPath: z.string(),
    generatedAt: z.string().describe('ISO 8601 timestamp'),
    analysisVersion: z.string().default('1.0.0'),
  }),
});

export type DayNPlanResult = z.infer<typeof DayNPlanResultSchema>;
