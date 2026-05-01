import { z } from 'zod';

/**
 * Zod schema for "Why Is This Here" explanation response
 * Defines the structure of the AI-generated explanation
 */

export const WhyIsThisHereExplanationSchema = z.object({
  // Brief summary of what the code does
  summary: z.string().describe('Brief summary of what this code does'),
  
  // Business reason - WHY this code exists from a business perspective
  businessReason: z.string().describe('The business reason or problem this code solves'),
  
  // Technical context - implementation details and technical decisions
  technicalContext: z.string().describe('Technical context, implementation details, and architectural decisions'),
  
  // Related changes - connections to other parts of the codebase
  relatedChanges: z.array(z.object({
    description: z.string().describe('Description of the related change'),
    location: z.string().optional().describe('File or location of the related change'),
    commit: z.string().optional().describe('Related commit hash'),
  })).optional().describe('Related changes in the codebase'),
  
  // Related commits from git history
  relatedCommits: z.array(z.object({
    hash: z.string(),
    message: z.string(),
    relevance: z.string().describe('How this commit relates to the explanation'),
  })).optional(),
  
  // Confidence level
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level of the explanation'),
  
  // Additional notes
  notes: z.string().optional().describe('Any additional notes or observations'),
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
