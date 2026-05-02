# Prompt Templates Documentation

> Complete reference for all IBM Bob prompt templates used in the Onboard extension

## Table of Contents

- [Overview](#overview)
- [Prompt Design Principles](#prompt-design-principles)
- [Repo X-Ray Prompts](#repo-x-ray-prompts)
- [Why Is This Here Prompts](#why-is-this-here-prompts)
- [Day-N Plan Prompts](#day-n-plan-prompts)
- [Starter Tasks Prompts](#starter-tasks-prompts)
- [Customizing Prompts](#customizing-prompts)
- [Best Practices](#best-practices)

---

## Overview

The Onboard extension uses structured prompts to interact with IBM Bob's AI capabilities. Each feature has dedicated prompt templates that:

1. **Provide clear context** about the repository and task
2. **Define structured outputs** using JSON schemas
3. **Guide the AI** with specific instructions and constraints
4. **Ensure consistency** across different repositories

All prompts are located in `src/features/*/prompt.ts` files and follow a consistent pattern.

---

## Prompt Design Principles

### 1. Role-Based Framing

Every prompt starts with a clear role definition:

```typescript
<role>
You are a senior software architect analyzing a codebase...
</role>
```

This sets the expertise level and perspective for the AI.

### 2. Structured Context

Context is provided in organized sections:

```typescript
<repository>
Name: ${repositoryName}
Path: ${repositoryPath}
File Tree: ${fileTree}
</repository>
```

### 3. Explicit Task Definition

Tasks are clearly defined with specific requirements:

```typescript
<task>
Your task:
1. Identify the main entry point(s)
2. Find initialization/setup files
3. Locate route/endpoint definitions
...
</task>
```

### 4. JSON Output Format

All prompts require structured JSON responses:

```typescript
<output_format>
CRITICAL: Return ONLY a valid JSON object.
{
  "field": "value",
  ...
}
</output_format>
```

### 5. Validation with Zod

Every prompt output is validated against a Zod schema to ensure type safety and correctness.

---

## Repo X-Ray Prompts

**Location:** `src/features/repo-xray/prompt.ts`

The Repo X-Ray feature uses a **4-stage pipeline** of prompts to build a comprehensive repository analysis.

### Stage 1: Entry Points Identification

**Function:** `buildEntryPointsPrompt(context: RepoContext)`

**Purpose:** Identifies main entry points, initialization files, and route definitions.

**Input Context:**
- Repository name and path
- Complete file tree
- package.json (if available)
- README.md (if available)

**Output Schema:**
```typescript
{
  entryPoints: [
    {
      file: string,
      role: string,
      description: string,
      importance: "critical" | "high" | "medium" | "low"
    }
  ],
  summary: string
}
```

**Example Usage:**
```typescript
const prompt = buildEntryPointsPrompt({
  repositoryPath: "/path/to/repo",
  repositoryName: "my-app",
  fileTree: "...",
  packageJson: "...",
  readme: "..."
});
```

**Key Instructions:**
- Focus on files critical to understanding application startup
- Identify main entry points, config files, and route definitions
- Classify importance level for each entry point

### Stage 2: Dependency Graph Analysis

**Function:** `buildDependencyGraphPrompt(context: RepoContext, entryPoints: EntryPointsResponse)`

**Purpose:** Maps architectural layers and dependencies between them.

**Input Context:**
- Repository context (from Stage 1)
- Identified entry points (from Stage 1)

**Output Schema:**
```typescript
{
  layers: [
    {
      name: string,
      description: string,
      files: string[],
      dependsOn: string[]
    }
  ],
  dependencyFlow: string,
  keyPatterns: string[]
}
```

**Key Instructions:**
- Identify distinct architectural layers (routes, services, models, utilities)
- Map which files belong to each layer
- Determine dependencies between layers
- Identify key architectural patterns (DI, middleware, repository pattern)

### Stage 3: Artifacts Generation

**Function:** `buildArtifactsPrompt(context, entryPoints, dependencyGraph, diagramFormat)`

**Purpose:** Creates architecture diagram, critical-path narrative, and conventions cheat sheet.

**Input Context:**
- Repository context
- Entry points (from Stage 1)
- Dependency graph (from Stage 2)
- Diagram format (default: "Mermaid")

**Output Schema:**
```typescript
{
  architectureDiagram: string,  // Mermaid syntax
  criticalPathNarrative: string,  // Markdown
  conventions: [
    {
      category: string,
      rule: string,
      examples: string[]
    }
  ],
  technicalStack: string[]
}
```

**Key Instructions:**
- Create Mermaid diagram showing architecture layers and dependencies
- Write 3-5 paragraph narrative explaining request flow
- Document naming conventions, file structure, error handling
- List technical stack (frameworks, libraries, tools)

### Stage 4: Weird Parts Detection

**Function:** `buildWeirdPartsPrompt(context, entryPoints, dependencyGraph, artifacts)`

**Purpose:** Identifies code that contradicts conventions with explanations.

**Input Context:**
- Repository context with source excerpts
- Entry points (from Stage 1)
- Dependency graph (from Stage 2)
- Artifacts (from Stage 3)

**Output Schema:**
```typescript
{
  _reasoning: string,  // Internal thinking
  weirdParts: [
    {
      file: string,
      lineRange: string,
      description: string,
      hypothesis: string,
      contradicts: string,
      severity: "high" | "medium" | "low",
      category: string
    }
  ],
  summary: string
}
```

**Key Instructions:**
- Find 5 specific categories of weird parts:
  1. Vendored/copied code from another library
  2. Hacks or workarounds
  3. Deprecated parameters or APIs
  4. Non-obvious behaviors based on parameters
  5. Unusual control-flow patterns
- Every finding must cite specific file and line range
- Quote or paraphrase the comment/code that makes it weird
- Limit deprecation findings to ONE maximum
- Aim for 7-10 substantive, varied findings

**Special Feature: Source Excerpts**

The weird parts prompt uses pre-extracted source excerpts (line-numbered windows around comments, decorators, TODO/HACK markers) to avoid hallucination:

```typescript
sourceExcerpts?: string;  // In RepoContext
```

---

## Why Is This Here Prompts

**Location:** `src/features/why-is-this-here/prompt.ts`

### Main Prompt

**Function:** `generateWhyIsThisHerePrompt(context: PromptContext)`

**Purpose:** Explains the business reason behind code using git history and PR context.

**Input Context:**
```typescript
{
  filePath: string,
  lineNumber: number | string,
  lineContent: string,
  history: GitLog[],
  commitDetails?: CommitDetails,
  linkedPRs?: PR[],
  surroundingCode?: string
}
```

**Output Schema:**
```typescript
{
  summary: string,
  businessReason: string,
  technicalContext: string,
  relatedChanges: [
    {
      description: string,
      location?: string,
      commit?: string
    }
  ],
  relatedCommits: [
    {
      hash: string,
      message: string,
      relevance: string
    }
  ],
  confidence: "high" | "medium" | "low",
  notes?: string
}
```

**Key Instructions:**
- Focus on WHY, not WHAT
- Connect to git history and PR information
- Synthesize context from multiple sources
- Explain business need and technical decisions
- Reference commit messages and historical decisions

**Example Prompt Structure:**
```
# Why Is This Here - Code Context Analysis

## Code Location
- File: src/app.py
- Line: 42
- Content: `if not user.is_authenticated:`

## Surrounding Code
[Code context]

## Git History
This line has been modified 3 time(s):
1. Fix auth bug for free-tier users
   - Author: Jane Doe
   - Date: 2024-01-15
   - Commit: abc1234

## Most Recent Commit Details
[Commit details]

## Linked Pull Requests
- PR #4521 - Fix security bug in auth middleware

## Task
Analyze the code and git history to explain WHY this code exists...
```

### Fallback Prompt

**Function:** `generateFallbackPrompt(filePath, lineNumber, lineContent, surroundingCode?)`

**Purpose:** Provides analysis when git history is not available.

**Key Differences:**
- No git history section
- Confidence automatically set to "low"
- Infers purpose from code structure only
- Includes note about missing git history

**Use Case:** Files not tracked in git or shallow clones without history.

---

## Day-N Plan Prompts

**Location:** `src/features/day-n-plan/prompt.ts`

### Main Prompt

**Function:** `buildDayNPlanPrompt(context: DayNPlanContext)`

**Purpose:** Creates a personalized 5-day onboarding plan based on role, seniority, and focus area.

**Input Context:**
```typescript
{
  repositoryPath: string,
  repositoryName: string,
  fileTree: string,
  config: PlanConfig,  // role, seniority, focusArea
  customTemplate?: string,
  repoXRayData?: {
    entryPoints?: string,
    architectureDiagram?: string,
    criticalPath?: string,
    conventions?: string,
    technicalStack?: string[]
  }
}
```

**Output Schema:**
```typescript
{
  role: string,
  seniority: string,
  focusArea: string,
  overview: string,
  days: [
    {
      day: number,
      concept: string,
      goal: string,
      readingList: [
        {
          filePath: string,
          description: string,
          estimatedMinutes: number,
          priority: "high" | "medium" | "low"
        }
      ],
      task: {
        title: string,
        description: string,
        starterFile: string,
        estimatedMinutes: number,
        difficulty: "beginner" | "intermediate" | "advanced"
      },
      tips: string[]
    }
  ],
  nextSteps: string[]
}
```

**Plan Structure:**

**Day 1: Orientation & Overview**
- Goal: Get the big picture
- Reading: High-level docs, README, architecture
- Task: Simple, low-risk (fix typo, update docs)
- Time: 2-3h reading, 1-2h task

**Day 2: Deep Dive - Core Domain**
- Goal: Understand core business logic
- Reading: Entry points, main services, core models
- Task: Trace request through system
- Time: 3-4h reading, 2-3h task

**Day 3: Deep Dive - Role-Specific Area**
- Goal: Master area relevant to role
- Reading: Files specific to role
- Task: Small feature or bug fix
- Time: 2-3h reading, 3-4h task

**Day 4: Integration & Patterns**
- Goal: Understand connections and conventions
- Reading: Utilities, shared components, test patterns
- Task: Refactor following conventions
- Time: 2-3h reading, 3-4h task

**Day 5: Real Contribution**
- Goal: Make meaningful contribution
- Reading: Related to first real task
- Task: Implement feature or fix real bug
- Time: 1-2h reading, 4-6h task

**Customization Guidelines:**

1. **Tailor to Seniority:**
   - Junior: More guidance, simpler tasks, more reading time
   - Mid: Balanced approach, moderate complexity
   - Senior: Less hand-holding, complex tasks, faster pace

2. **Tailor to Role:**
   - Backend: APIs, services, data models, business logic
   - Frontend: Components, state management, UI patterns
   - Full-stack: Balance between frontend and backend
   - DevOps: Infrastructure, deployment, CI/CD
   - QA: Test patterns, test infrastructure

3. **Make it Actionable:**
   - Provide specific file paths
   - Clear task descriptions with acceptance criteria
   - Realistic time estimates
   - Helpful tips for each day

**Example Usage:**
```typescript
const prompt = buildDayNPlanPrompt({
  repositoryPath: "/path/to/repo",
  repositoryName: "my-app",
  fileTree: "...",
  config: {
    role: "backend",
    seniority: "mid",
    focusArea: "API development"
  },
  repoXRayData: {
    technicalStack: ["FastAPI", "PostgreSQL", "Redis"]
  }
});
```

---

## Starter Tasks Prompts

**Location:** `src/features/starter-tasks/prompt.ts`

### Main Prompt

**Function:** `buildStarterTasksPrompt(context: StarterTasksContext)`

**Purpose:** Analyzes TODO/FIXME comments and GitHub issues to suggest beginner-friendly tasks.

**Input Context:**
```typescript
{
  repositoryName: string,
  repositoryPath: string,
  fileTree: string,
  searchHits: SearchHit[],  // TODO/FIXME findings
  techStack: string[],
  githubIssues?: GitHubIssue[]
}

interface SearchHit {
  filePath: string,
  lineNumber: number,
  content: string,
  surroundingCode: string
}
```

**Output Schema:**
```typescript
{
  tasks: [
    {
      title: string,
      description: string,
      file: string,
      line: number,
      hints: string[],
      expected_outcome: string,
      difficulty: "easy" | "medium" | "hard"
    }
  ],
  analysis_summary: string
}
```

**Good Starter Task Criteria:**

1. **Low stakes**: Doesn't involve critical business logic
2. **Local**: Can be completed in 1-2 files
3. **Clear**: Well-defined problem and outcome
4. **Instructive**: Helps learn about codebase or conventions

**Key Instructions:**
- Filter and prioritize found comments
- Select 3 most suitable tasks
- Enrich with better titles and descriptions
- Explain why each task is good for starters
- Provide 2-3 specific hints
- Define clear "done" criteria
- Label difficulty appropriately

**Example Prompt Structure:**
```
<role>
You are a senior technical mentor helping a new developer...
</role>

<task>
Analyze TODO/FIXME comments and GitHub issues to identify top 3 starter tasks.

<repository_context>
Name: my-app
Tech Stack: FastAPI, PostgreSQL, Redis
</repository_context>

<found_comments>
[1] src/api/users.py:42
Content: # TODO: Add input validation for email field
Context:
```python
def create_user(email: str):
    # TODO: Add input validation for email field
    user = User(email=email)
```
</found_comments>

<guidelines>
1. Filter and prioritize
2. Enrich descriptions
3. Contextualize learning value
4. Provide specific hints
5. Define expected outcome
</guidelines>
```

---

## Customizing Prompts

### Modifying Existing Prompts

1. **Locate the prompt file:**
   ```
   src/features/<feature-name>/prompt.ts
   ```

2. **Edit the prompt function:**
   ```typescript
   export function buildMyPrompt(context: MyContext): string {
     return `<role>
     Your custom role...
     </role>
     
     <task>
     Your custom task...
     </task>`;
   }
   ```

3. **Update the schema if needed:**
   ```typescript
   // In schema.ts
   export const MyResponseSchema = z.object({
     newField: z.string(),
     // ...
   });
   ```

4. **Test the changes:**
   ```bash
   npm run compile
   npm test
   ```

### Adding New Prompts

1. **Create prompt function:**
   ```typescript
   export function buildNewFeaturePrompt(context: NewContext): string {
     return `<role>...</role><task>...</task><output_format>...</output_format>`;
   }
   ```

2. **Define context interface:**
   ```typescript
   export interface NewContext {
     repositoryPath: string;
     // ... other fields
   }
   ```

3. **Create Zod schema:**
   ```typescript
   export const NewFeatureSchema = z.object({
     // Define expected output structure
   });
   ```

4. **Integrate with Bob client:**
   ```typescript
   const prompt = buildNewFeaturePrompt(context);
   const response = await bobClient.chat(prompt);
   const validated = NewFeatureSchema.parse(JSON.parse(response));
   ```

### Custom Templates

The Day-N Plan feature supports custom templates:

```typescript
const customTemplate = `
Day 1: Custom orientation
- Read X, Y, Z
- Do task A

Day 2: Custom deep dive
...
`;

const prompt = buildDayNPlanPrompt({
  // ... other context
  customTemplate
});
```

---

## Best Practices

### 1. Clear Role Definition

Always start with a clear role that sets expertise level:

```typescript
<role>
You are a senior software architect with 10+ years of experience...
</role>
```

### 2. Structured Context

Organize context in logical sections:

```typescript
<repository>...</repository>
<task>...</task>
<guidelines>...</guidelines>
<output_format>...</output_format>
```

### 3. Explicit Output Format

Always specify exact JSON structure:

```typescript
<output_format>
CRITICAL: Return ONLY a valid JSON object.
{
  "field": "value"
}
IMPORTANT: Your response must start with { and end with }.
</output_format>
```

### 4. Validation

Always validate responses with Zod schemas:

```typescript
const schema = z.object({
  field: z.string()
});

const validated = schema.parse(JSON.parse(response));
```

### 5. Error Handling

Handle parsing and validation errors gracefully:

```typescript
try {
  const parsed = JSON.parse(response);
  const validated = schema.parse(parsed);
  return validated;
} catch (error) {
  if (error instanceof z.ZodError) {
    // Handle validation error
  } else {
    // Handle parsing error
  }
}
```

### 6. Context Optimization

Provide enough context but avoid overwhelming the model:

- Include relevant file tree sections
- Limit code excerpts to essential parts
- Summarize large documents
- Use pagination for large outputs

### 7. Iterative Refinement

Test prompts with different repositories:

```bash
# Test on small repo
# Test on large repo
# Test on different languages
# Test edge cases
```

### 8. Documentation

Document prompt changes:

```typescript
/**
 * Builds prompt for X feature
 * 
 * @param context - Repository context
 * @returns Formatted prompt string
 * 
 * @example
 * const prompt = buildPrompt({ ... });
 */
```

### 9. Version Control

Track prompt changes in git:

```bash
git commit -m "feat(prompts): improve weird parts detection"
```

### 10. Performance Monitoring

Monitor prompt performance:

- Response time
- Token usage
- Accuracy metrics
- User feedback

---

## Troubleshooting

### Common Issues

**Issue: JSON parsing fails**

Solution: Ensure output format instructions are clear:
```typescript
CRITICAL: Return ONLY a valid JSON object.
Do not include markdown formatting or code blocks.
```

**Issue: Responses are too generic**

Solution: Provide more specific context:
```typescript
// Add more context
const context = {
  ...baseContext,
  sampleFiles: { ... },
  sourceExcerpts: "..."
};
```

**Issue: Validation errors**

Solution: Make schema more flexible or improve prompt:
```typescript
// Use optional fields
const schema = z.object({
  required: z.string(),
  optional: z.string().optional()
});
```

**Issue: Inconsistent outputs**

Solution: Add more constraints in prompt:
```typescript
<guidelines>
1. Always include X
2. Never include Y
3. Format Z as ...
</guidelines>
```

---

## Examples

### Complete Example: Custom Feature

```typescript
// 1. Define context
export interface CustomContext {
  repositoryPath: string;
  fileTree: string;
}

// 2. Create prompt
export function buildCustomPrompt(context: CustomContext): string {
  return `<role>
You are a code reviewer analyzing ${context.repositoryPath}.
</role>

<task>
Review the file tree and identify potential issues.

File Tree:
${context.fileTree}
</task>

<output_format>
{
  "issues": [
    {
      "file": "path/to/file",
      "issue": "description",
      "severity": "high|medium|low"
    }
  ]
}
</output_format>`;
}

// 3. Define schema
export const CustomSchema = z.object({
  issues: z.array(z.object({
    file: z.string(),
    issue: z.string(),
    severity: z.enum(['high', 'medium', 'low'])
  }))
});

// 4. Use in command
const prompt = buildCustomPrompt(context);
const response = await bobClient.chat(prompt);
const validated = CustomSchema.parse(JSON.parse(response));
```

---

## Contributing

When contributing prompt improvements:

1. Test with multiple repositories
2. Update corresponding schema
3. Add tests for new functionality
4. Document changes in this file
5. Include examples in PR description

---

## Resources

- [IBM Bob Documentation](https://www.ibm.com/bob/docs)
- [Zod Schema Validation](https://zod.dev/)
- [Mermaid Diagram Syntax](https://mermaid.js.org/)
- [Extension Source Code](../onboard-extension/src/)

---

**Last Updated:** 2026-05-02
**Version:** 1.0.0
