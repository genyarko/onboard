import { z } from 'zod';

/**
 * Zod schema for "Why Is This Here" explanation response
 * Defines the structure of the AI-generated explanation
 */

export const WhyIsThisHereExplanationSchema = z.object({
  summary: z.string().default('').describe('Brief summary of what this code does'),
  businessReason: z.string().default('').describe('The business reason or problem this code solves'),
  technicalContext: z.string().default('').describe('Technical context, implementation details, and architectural decisions'),
  relatedChanges: z.array(z.object({
    description: z.string(),
    location: z.string().optional(),
    commit: z.string().optional(),
  })).optional(),
  relatedCommits: z.array(z.object({
    hash: z.string(),
    message: z.string(),
    relevance: z.string(),
  })).optional(),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  notes: z.string().optional(),
});

export type WhyIsThisHereExplanation = z.infer<typeof WhyIsThisHereExplanationSchema>;

/**
 * Schema for fallback explanation (when git history is not available)
 */
export const FallbackExplanationSchema = z.object({
  // What the code does
  purpose: z.string().describe('What this line of code does'),
  
  // Inferred reason
  inferredReason: z.string().describe('Likely reason based on code analysis'),
  
  // Potential concerns
  concerns: z.array(z.string()).optional().describe('Potential issues or improvements'),
  
  // Confidence level
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level of the analysis'),
});

export type FallbackExplanation = z.infer<typeof FallbackExplanationSchema>;

/**
 * Helper function to validate explanation response
 */
export function validateExplanation(data: unknown): WhyIsThisHereExplanation {
  return WhyIsThisHereExplanationSchema.parse(data);
}

/**
 * Helper function to validate fallback explanation
 */
export function validateFallbackExplanation(data: unknown): FallbackExplanation {
  return FallbackExplanationSchema.parse(data);
}
