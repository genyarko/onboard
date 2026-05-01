import { z } from 'zod';

/**
 * Schema for entry points identification (Prompt 1)
 * Identifies main entry points, app initialization, and route definitions
 */
export const EntryPointSchema = z.object({
  file: z.string().describe('Absolute or relative path to the file'),
  role: z.string().describe('Role of this entry point (e.g., "main application", "route definitions", "CLI entry")'),
  description: z.string().describe('Brief description of what this entry point does'),
  importance: z.enum(['critical', 'high', 'medium', 'low']).describe('Importance level of this entry point'),
});

export const EntryPointsResponseSchema = z.object({
  entryPoints: z.array(EntryPointSchema).describe('List of identified entry points'),
  summary: z.string().describe('Brief summary of the application structure'),
});

export type EntryPoint = z.infer<typeof EntryPointSchema>;
export type EntryPointsResponse = z.infer<typeof EntryPointsResponseSchema>;

/**
 * Schema for dependency graph analysis (Prompt 2)
 * Maps architectural layers and dependencies
 */
export const LayerSchema = z.object({
  name: z.string().describe('Name of the architectural layer (e.g., "routes", "services", "models")'),
  description: z.string().describe('Description of this layer\'s responsibility'),
  files: z.array(z.string()).describe('Files belonging to this layer'),
  dependsOn: z.array(z.string()).describe('Names of layers this layer depends on'),
});

export const DependencyGraphResponseSchema = z.object({
  layers: z.array(LayerSchema).describe('Identified architectural layers'),
  dependencyFlow: z.string().describe('High-level description of how data/control flows through layers'),
  keyPatterns: z.array(z.string()).describe('Key architectural patterns identified (e.g., "dependency injection", "middleware pattern")'),
});

export type Layer = z.infer<typeof LayerSchema>;
export type DependencyGraphResponse = z.infer<typeof DependencyGraphResponseSchema>;

/**
 * Schema for artifacts generation (Prompt 3)
 * Architecture diagram, narrative, and conventions
 */
export const ConventionSchema = z.object({
  category: z.string().describe('Category of convention (e.g., "naming", "file structure", "error handling")'),
  rule: z.string().describe('The convention rule'),
  examples: z.array(z.string()).describe('Example files or code snippets demonstrating this convention'),
});

export const ArtifactsResponseSchema = z.object({
  architectureDiagram: z.string().describe('Mermaid diagram syntax representing the architecture'),
  criticalPathNarrative: z.string().describe('Markdown narrative explaining the critical path through the codebase'),
  conventions: z.array(ConventionSchema).describe('List of identified coding conventions'),
  technicalStack: z.array(z.string()).describe('Key technologies, frameworks, and libraries used'),
});

export type Convention = z.infer<typeof ConventionSchema>;
export type ArtifactsResponse = z.infer<typeof ArtifactsResponseSchema>;

/**
 * Schema for weird parts analysis (Prompt 4)
 * Identifies code that contradicts conventions with explanations
 */
export const WeirdPartSchema = z.object({
  file: z.string().describe('File containing the weird part'),
  lineRange: z.string().optional().describe('Line range if applicable (e.g., "45-67")'),
  description: z.string().describe('What makes this code weird or unexpected'),
  hypothesis: z.string().describe('Hypothesis about why this exists (historical reason, workaround, etc.)'),
  contradicts: z.string().optional().describe('Which convention or pattern this contradicts'),
  severity: z.enum(['high', 'medium', 'low']).describe('How much this deviates from normal patterns'),
});

export const WeirdPartsResponseSchema = z.object({
  weirdParts: z.array(WeirdPartSchema).describe('List of identified weird parts'),
  summary: z.string().describe('Overall assessment of code consistency'),
});

export type WeirdPart = z.infer<typeof WeirdPartSchema>;
export type WeirdPartsResponse = z.infer<typeof WeirdPartsResponseSchema>;

/**
 * Combined schema for the complete Repo X-Ray output
 * This represents the final aggregated result from all 4 prompts
 */
export const RepoXRayResultSchema = z.object({
  entryPoints: EntryPointsResponseSchema,
  dependencyGraph: DependencyGraphResponseSchema,
  artifacts: ArtifactsResponseSchema,
  weirdParts: WeirdPartsResponseSchema,
  metadata: z.object({
    repositoryPath: z.string(),
    analyzedAt: z.string().describe('ISO 8601 timestamp'),
    totalFiles: z.number().optional(),
    analysisVersion: z.string().default('1.0.0'),
  }),
});

export type RepoXRayResult = z.infer<typeof RepoXRayResultSchema>;
