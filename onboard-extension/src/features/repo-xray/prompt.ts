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
Return a JSON object matching this exact structure:
{
  "entryPoints": [
    {
      "file": "path/to/file.py",
      "role": "main application entry point",
      "description": "Brief description of what this file does",
      "importance": "critical" | "high" | "medium" | "low"
    }
  ],
  "summary": "Brief summary of the application structure and how it initializes"
}

Ensure the JSON is valid and matches the schema exactly.
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
Return a JSON object matching this exact structure:
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

Ensure the JSON is valid and matches the schema exactly.
</output_format>`;
}

/**
 * Prompt 3: Generate Artifacts
 * Creates architecture diagram, narrative, and conventions cheat sheet
 */
export function buildArtifactsPrompt(
  context: RepoContext,
  entryPoints: EntryPointsResponse,
  dependencyGraph: DependencyGraphResponse
): string {
  const layersList = dependencyGraph.layers
    .map(layer => `- ${layer.name}: ${layer.description}`)
    .join('\n');

  return `<role>
You are a senior software architect creating comprehensive documentation for a codebase.
</role>

<task>
Create three key artifacts to help engineers understand this codebase:
1. An architecture diagram in Mermaid syntax
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
1. Create a Mermaid diagram showing the architecture (use flowchart or graph syntax)
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
Return a JSON object matching this exact structure:
{
  "architectureDiagram": "graph TD\\n    A[Entry] --> B[Routes]\\n    B --> C[Services]\\n    ...",
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

Ensure:
- Mermaid syntax is valid and will render correctly
- Narrative is in markdown format with proper headings
- Conventions are specific and actionable
- JSON is valid and matches the schema exactly
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

  return `<role>
You are a senior software architect conducting a code review to identify anomalies and technical debt.
</role>

<task>
Analyze the codebase to find "weird parts" - code that contradicts the identified conventions or seems unusual.
These could be:
- Legacy code that doesn't follow current patterns
- Workarounds for bugs or limitations
- Non-obvious design decisions
- Code that violates the established conventions
- Unusual dependencies or coupling

Repository: ${context.repositoryName}
Path: ${context.repositoryPath}

File Tree:
${context.fileTree}

Established Conventions:
${conventionsList}

Architectural Layers:
${dependencyGraph.layers.map(l => l.name).join(', ')}

Key Patterns:
${dependencyGraph.keyPatterns.join(', ')}

Your task:
1. Scan the file structure for files that don't fit the established patterns
2. Look for code that contradicts the documented conventions
3. Identify unusual dependencies or architectural violations
4. For each weird part found:
   - Describe what makes it weird
   - Hypothesize WHY it exists (historical reason, workaround, etc.)
   - Note which convention it contradicts (if applicable)
   - Assess severity (how much it deviates from normal patterns)
5. Provide an overall assessment of code consistency

Focus on finding 3-7 significant weird parts. Don't list minor style inconsistencies.
Be constructive - these aren't necessarily "bad", just worth understanding.
</task>

<output_format>
Return a JSON object matching this exact structure:
{
  "weirdParts": [
    {
      "file": "path/to/weird_file.py",
      "lineRange": "45-67",
      "description": "This file uses camelCase instead of snake_case",
      "hypothesis": "Likely legacy code from before the project standardized on snake_case",
      "contradicts": "naming convention for functions",
      "severity": "medium"
    }
  ],
  "summary": "Overall assessment of code consistency and technical debt"
}

Ensure:
- Focus on significant deviations, not minor style issues
- Hypotheses are thoughtful and plausible
- Severity ratings are justified
- JSON is valid and matches the schema exactly
</output_format>`;
}

/**
 * Helper function to build context from repository
 * This would be called by the command handler
 */
export function buildRepoContext(
  repositoryPath: string,
  fileTree: string,
  additionalFiles?: Record<string, string>
): RepoContext {
  const repositoryName = repositoryPath.split(/[/\\]/).pop() || 'unknown';
  
  return {
    repositoryPath,
    repositoryName,
    fileTree,
    sampleFiles: additionalFiles,
    packageJson: additionalFiles?.['package.json'],
    readme: additionalFiles?.['README.md'],
  };
}
