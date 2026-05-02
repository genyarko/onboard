import { EntryPointsResponse, DependencyGraphResponse, ArtifactsResponse, WeirdPartsResponse } from './schema';

/**
 * Context object passed to prompts
 */
export interface RepoContext {
  repositoryPath: string;
  repositoryName: string;
  fileTree: string;
  sampleFiles?: Record<string, string>; // file path -> content
  packageJson?: string;
  readme?: string;
  // Pre-extracted source excerpts (path + line-numbered windows around interesting
  // markers like comments, decorators, TODO/HACK). The weird-parts prompt uses this
  // because the file tree alone forces the model to hallucinate.
  sourceExcerpts?: string;
}

/**
 * Prompt 1: Identify Entry Points
 * Finds main entry points, app initialization, and route definitions
 */
export function buildEntryPointsPrompt(context: RepoContext): string {
  return `<role>
You are a senior software architect analyzing a codebase to identify its entry points and initialization flow.
</role>

<task>
Analyze the following repository structure and identify all main entry points, application initialization files, and route/endpoint definitions.

Repository: ${context.repositoryName}
Path: ${context.repositoryPath}

File Tree:
${context.fileTree}

${context.packageJson ? `Package.json:\n${context.packageJson}\n` : ''}
${context.readme ? `README.md:\n${context.readme}\n` : ''}

Your task:
1. Identify the main entry point(s) where the application starts
2. Find initialization/setup files (config, app factory, etc.)
3. Locate route/endpoint definition files
4. Determine the importance level of each entry point
5. Provide a brief summary of the application structure

Focus on files that are critical to understanding how the application starts and handles requests.
</task>

<output_format>
CRITICAL: Return ONLY a valid JSON object. Do not include any markdown formatting, code blocks, or explanatory text.
Return ONLY this JSON structure:
{
  "entryPoints": [
    {
      "file": "path/to/file.py",
      "role": "main application entry point",
      "description": "Brief description of what this file does",
      "importance": "critical"
    }
  ],
  "summary": "Brief summary of the application structure and how it initializes"
}

IMPORTANT: Your response must start with { and end with }. No other text before or after.
</output_format>`;
}

/**
 * Prompt 2: Analyze Dependency Graph
 * Maps architectural layers and dependencies between them
 */
export function buildDependencyGraphPrompt(
  context: RepoContext,
  entryPoints: EntryPointsResponse
): string {
  const entryPointsList = entryPoints.entryPoints
    .map(ep => `- ${ep.file}: ${ep.role}`)
    .join('\n');

  return `<role>
You are a senior software architect analyzing a codebase to map its architectural layers and dependency flow.
</role>

<task>
Based on the identified entry points, analyze the repository structure to map out architectural layers and dependencies.

Repository: ${context.repositoryName}
Path: ${context.repositoryPath}

File Tree:
${context.fileTree}

Identified Entry Points:
${entryPointsList}

Entry Points Summary:
${entryPoints.summary}

Your task:
1. Identify distinct architectural layers (e.g., routes/controllers, services/business logic, models/data, utilities)
2. Map which files belong to each layer
3. Determine dependencies between layers (which layers depend on which)
4. Describe the overall data/control flow through the layers
5. Identify key architectural patterns (e.g., dependency injection, middleware, repository pattern)

Focus on understanding the separation of concerns and how different parts of the codebase interact.
</task>

<output_format>
CRITICAL: Return ONLY a valid JSON object. Do not include any markdown formatting, code blocks, or explanatory text.
Return ONLY this JSON structure:
{
  "layers": [
    {
      "name": "routes",
      "description": "HTTP route handlers and controllers",
      "files": ["path/to/routes.py", "path/to/controllers.py"],
      "dependsOn": ["services", "models"]
    }
  ],
  "dependencyFlow": "High-level description of how data/control flows through the layers",
  "keyPatterns": ["dependency injection", "middleware pattern", "repository pattern"]
}

IMPORTANT: Your response must start with { and end with }. No other text before or after.
</output_format>`;
}

/**
 * Prompt 3: Generate Artifacts
 * Creates architecture diagram, narrative, and conventions cheat sheet
 */
export function buildArtifactsPrompt(
  context: RepoContext,
  entryPoints: EntryPointsResponse,
  dependencyGraph: DependencyGraphResponse,
  diagramFormat: string = 'Mermaid'
): string {
  const layersList = dependencyGraph.layers
    .map(layer => `- ${layer.name}: ${layer.description}`)
    .join('\n');

  return `<role>
You are a senior software architect creating comprehensive documentation for a codebase.
</role>

<task>
Create three key artifacts to help engineers understand this codebase:
1. An architecture diagram in ${diagramFormat} syntax
2. A critical-path narrative explaining how a typical request flows through the system
3. A conventions cheat sheet documenting coding standards and patterns

Repository: ${context.repositoryName}
Path: ${context.repositoryPath}

Architectural Layers:
${layersList}

Dependency Flow:
${dependencyGraph.dependencyFlow}

Key Patterns:
${dependencyGraph.keyPatterns.join(', ')}

Entry Points Summary:
${entryPoints.summary}

Your task:
1. Create a ${diagramFormat} diagram showing the architecture (use flowchart or graph syntax)
   - Show layers and their relationships
   - Include key components within each layer
   - Use arrows to show dependency direction
2. Write a critical-path narrative (markdown format):
   - Explain how a typical request flows from entry to response
   - Highlight key decision points and transformations
   - Keep it concise but informative (3-5 paragraphs)
3. Document conventions:
   - Naming conventions (files, functions, classes)
   - File structure patterns
   - Error handling approaches
   - Testing patterns
   - Any other notable conventions
4. List the technical stack (frameworks, libraries, tools)

Focus on making this immediately useful for a new engineer joining the project.
</task>

<output_format>
CRITICAL: Return ONLY a valid JSON object. Do not include any markdown formatting, code blocks, or explanatory text.
Return ONLY this JSON structure:
{
  "architectureDiagram": "${diagramFormat} code block representing the system architecture (do NOT include \`\`\` wrappers)",
  "criticalPathNarrative": "## Critical Path\\n\\nWhen a request arrives...\\n\\n### Step 1: Routing\\n...",
  "conventions": [
    {
      "category": "naming",
      "rule": "Use snake_case for functions and variables",
      "examples": ["def process_request()", "user_data = {}"]
    }
  ],
  "technicalStack": ["FastAPI", "Pydantic", "SQLAlchemy", "pytest"]
}

IMPORTANT: Your response must start with { and end with }. No other text before or after.
</output_format>`;
}

/**
 * Prompt 4: Identify Weird Parts
 * Finds code that contradicts conventions with explanations
 */
export function buildWeirdPartsPrompt(
  context: RepoContext,
  entryPoints: EntryPointsResponse,
  dependencyGraph: DependencyGraphResponse,
  artifacts: ArtifactsResponse
): string {
  const conventionsList = artifacts.conventions
    .map(conv => `- ${conv.category}: ${conv.rule}`)
    .join('\n');

  const sourceSection = context.sourceExcerpts
    ? `Source Excerpts (line-numbered windows around comments, decorators, and HACK/TODO markers — this is your primary evidence):
${context.sourceExcerpts}
`
    : '';

  return `<role>
You are a senior software architect conducting a code review to identify anomalies and technical debt.
</role>

<task>
Find "weird parts" in this codebase — code-level oddities, not file-naming or directory-layout drift.
Specifically look for these EXACT 5 categories:
1. Vendored/copied code from another library (look for comments referencing upstream removal or backward compatibility)
2. Hacks or workarounds (look for the words "hack", "workaround", "compatibility" in comments)
3. Deprecated parameters or APIs that still work (look for @deprecated decorators, "deprecated in favor of" docstrings)
4. Non-obvious behaviors driven by parameter count, type, or runtime state (e.g. changing behavior if there is more than one parameter)
5. Nested context managers, double exit stacks, or other unusual control-flow patterns (e.g., AsyncExitStack)

Repository: ${context.repositoryName}
Path: ${context.repositoryPath}

${sourceSection}File Tree (for reference only — DO NOT invent weird parts from filenames alone):
${context.fileTree}

Established Conventions:
${conventionsList}

Architectural Layers:
${dependencyGraph.layers.map(l => l.name).join(', ')}

Key Patterns:
${dependencyGraph.keyPatterns.join(', ')}

Rules:
1. Every weird part you report MUST cite a specific file and line range that appears in the source excerpts above. Do not invent line numbers.
2. Quote or closely paraphrase the comment/code that makes it weird — generic statements like "non-standard naming" are NOT acceptable.
3. The "hypothesis" field should explain WHY the code exists, grounded in what the comments or code structure tell you.
4. Skip stylistic nits (whitespace, naming) — focus on the categories listed above.
5. **HARD CONSTRAINT — Limit Deprecation Noise.** Deprecation findings are low-signal. You MUST NOT include more than ONE finding related to a deprecated API or parameter. If you see multiple deprecations, pick only the most architecturally significant ONE and ignore the rest.
6. **Diversification:** Ensure you actively search for and include findings from ALL other categories: vendored code (e.g. "copy of", "removed in upstream"), explicit hacks (e.g. "hack for compatibility"), non-obvious behaviors based on parameters (e.g. "More than one dependency could have the same field"), and unusual control flows (e.g. nested AsyncExitStacks).
7. Aim for 7-10 substantive, *varied* weird parts. Quality over quantity.
</task>

<output_format>
CRITICAL: Return ONLY a valid JSON object. Do not include any markdown formatting, code blocks, or explanatory text.
Return ONLY this JSON structure:
{
  "_reasoning": "Use this field to 'think out loud'. Systematically scan the source excerpts and list potential candidates for each of the required categories. Evaluate whether each candidate is truly an architectural oddity or just a generic deprecation. Once you have a diverse list, proceed to populate the weirdParts array.",
  "weirdParts": [
    {
      "file": "src/some_module.py",
      "lineRange": "12-34",
      "description": "Quote or closely paraphrase the comment/code that makes this weird, naming the specific construct",
      "hypothesis": "Why this exists, grounded in what the comments or code structure say",
      "contradicts": "Which convention or expectation this violates",
      "severity": "medium",
      "category": "Vendored Code"
    }
  ],
  "summary": "Overall assessment of code consistency and technical debt"
}

IMPORTANT: Your response must start with { and end with }. No other text before or after.
</output_format>`;
}

/**
 * Helper function to build context from repository
 * This would be called by the command handler
 */
export function buildRepoContext(
  repositoryPath: string,
  fileTree: string,
  additionalFiles?: Record<string, string>,
  sourceExcerpts?: string
): RepoContext {
  const repositoryName = repositoryPath.split(/[/\\]/).pop() || 'unknown';

  return {
    repositoryPath,
    repositoryName,
    fileTree,
    sampleFiles: additionalFiles,
    packageJson: additionalFiles?.['package.json'],
    readme: additionalFiles?.['README.md'],
    sourceExcerpts,
  };
}
