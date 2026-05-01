import { z } from 'zod';

/**
 * Zod schema for a single starter task
 */
export const StarterTaskSchema = z.object({
  title: z.string().describe('Short, descriptive title of the task'),
  description: z.string().describe('Detailed explanation of what needs to be done'),
  file: z.string().describe('Relative path to the file containing the task'),
  line: z.number().describe('Line number where the task or relevant code starts'),
  hints: z.array(z.string()).describe('List of helpful tips or pointers to get started'),
  expected_outcome: z.string().describe('What the code should look like or do after completion'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Estimated difficulty level'),
});

/**
 * Zod schema for the collection of starter tasks returned by Bob
 */
export const StarterTasksResponseSchema = z.object({
  tasks: z.array(StarterTaskSchema).max(3).describe('List of up to 3 recommended starter tasks'),
  analysis_summary: z.string().describe('Brief summary of the codebase scanning process'),
});

export type StarterTask = z.infer<typeof StarterTaskSchema>;
export type StarterTasksResponse = z.infer<typeof StarterTasksResponseSchema>;

/**
 * Helper function to validate the starter tasks response
 */
export function validateStarterTasks(data: unknown): StarterTasksResponse {
  return StarterTasksResponseSchema.parse(data);
}
