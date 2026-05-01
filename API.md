# Onboard Extension API Documentation

> Technical reference for developers working with or extending the Onboard VS Code extension.

## Table of Contents

- [Bob Client API](#bob-client-api)
- [Feature APIs](#feature-apis)
  - [Repo X-Ray](#repo-x-ray-api)
  - [Why Is This Here](#why-is-this-here-api)
  - [Day-N Plan](#day-n-plan-api)
  - [Starter Tasks](#starter-tasks-api)
- [Prompt Templates](#prompt-templates)
- [Schema Definitions](#schema-definitions)
- [Extension Points](#extension-points)
- [Testing Utilities](#testing-utilities)

---

## Bob Client API

### `BobClient`

Central interface for all IBM Bob API interactions.

**Location:** `src/bob/client.ts`

#### Methods

##### `ask(prompt: string, context?: BobContext): Promise<string>`

Sends a prompt to Bob and returns the response.

**Parameters:**
- `prompt` (string): The prompt to send to Bob
- `context` (BobContext, optional): Additional context for the request

**Returns:** `Promise<string>` - Bob's response

**Throws:** `Error` if API key is not configured or request fails

**Example:**
```typescript
import { ask } from './bob/client';

const response = await ask(
  'Analyze this code and explain its purpose',
  { 
    files: ['src/main.ts'],
    maxTokens: 2000 
  }
);
```

##### `askStructured<T>(prompt: string, schema: z.ZodSchema<T>, context?: BobContext): Promise<T>`

Sends a prompt to Bob and validates the response against a Zod schema.

**Parameters:**
- `prompt` (string): The prompt to send to Bob
- `schema` (z.ZodSchema<T>): Zod schema for validation
- `context` (BobContext, optional): Additional context

**Returns:** `Promise<T>` - Validated, typed response

**Throws:** 
- `Error` if API key is not configured or request fails
- `z.ZodError` if response doesn't match schema

**Example:**
```typescript
import { askStructured } from './bob/client';
import { RepoXRaySchema } from './features/repo-xray/schema';

const analysis = await askStructured(
  buildRepoXRayPrompt(repoPath),
  RepoXRaySchema
);
```

#### Types

##### `BobContext`

```typescript
interface BobContext {
  files?: string[];           // File paths to include as context
  maxTokens?: number;         // Maximum tokens in response
  temperature?: number;       // Sampling temperature (0-1)
  systemPrompt?: string;      // Custom system prompt
}
```

##### `BobConfig`

```typescript
interface BobConfig {
  apiKey: string;             // IBM Bob API key
  endpoint?: string;          // API endpoint (default: from env)
  timeout?: number;           // Request timeout in ms (default: 60000)
}
```

---

## Feature APIs

### Repo X-Ray API

Analyzes repository architecture and generates comprehensive documentation.

**Location:** `src/features/repo-xray/`

#### Command

##### `executeRepoXRay(): Promise<void>`

Main command handler for Repo X-Ray feature.

**Location:** `src/features/repo-xray/command.ts`

**Behavior:**
1. Validates workspace is open
2. Scans repository structure
3. Sends analysis request to Bob
4. Validates response against schema
5. Renders markdown document
6. Opens in VS Code preview

**Throws:** `Error` if workspace not found or analysis fails

**Example:**
```typescript
import { executeRepoXRay } from './features/repo-xray/command';

// Triggered by command palette
await executeRepoXRay();
```

#### Prompt Builder

##### `buildRepoXRayPrompt(repoPath: string): string`

Constructs the prompt for Bob to analyze repository architecture.

**Location:** `src/features/repo-xray/prompt.ts`

**Parameters:**
- `repoPath` (string): Absolute path to repository root

**Returns:** `string` - Formatted prompt with instructions

**Example:**
```typescript
import { buildRepoXRayPrompt } from './features/repo-xray/prompt';

const prompt = buildRepoXRayPrompt('/path/to/repo');
```

#### Schema

##### `RepoXRaySchema`

Zod schema for validating Bob's Repo X-Ray response.

**Location:** `src/features/repo-xray/schema.ts`

**Type Definition:**
```typescript
interface RepoXRayAnalysis {
  architecture: {
    diagram: string;              // Mermaid diagram
    layers: Layer[];              // System layers
    entryPoints: string[];        // Main entry files
  };
  narrative: {
    overview: string;             // High-level summary
    criticalPath: string[];       // Key execution flows
    dataFlow: string;             // Data movement description
  };
  conventions: {
    naming: string[];             // Naming patterns
    structure: string[];          // Directory patterns
    patterns: string[];           // Design patterns used
  };
  weirdParts: WeirdPart[];        // Unusual code patterns
}

interface Layer {
  name: string;
  description: string;
  files: string[];
}

interface WeirdPart {
  location: string;               // File path
  description: string;            // What's weird
  reason: string;                 // Why it exists
  impact: string;                 // Implications
}
```

#### Renderer

##### `renderRepoXRay(analysis: RepoXRayAnalysis): string`

Converts analysis object to formatted markdown.

**Location:** `src/features/repo-xray/render.ts`

**Parameters:**
- `analysis` (RepoXRayAnalysis): Validated analysis from Bob

**Returns:** `string` - Markdown document

**Example:**
```typescript
import { renderRepoXRay } from './features/repo-xray/render';

const markdown = renderRepoXRay(analysis);
```

---

### Why Is This Here API

Explains the business context behind code using git history and PR/issue data.

**Location:** `src/features/why-is-this-here/`

#### Command

##### `executeWhyIsThisHere(): Promise<void>`

Main command handler for Why Is This Here feature.

**Location:** `src/features/why-is-this-here/command.ts`

**Behavior:**
1. Gets active editor and cursor position
2. Extracts line and surrounding context
3. Fetches git history for line range
4. Retrieves linked PR/issue data
5. Sends to Bob for synthesis
6. Displays result in hover or panel

**Throws:** `Error` if no active editor or git history unavailable

##### `clearWhyIsThisHereCache(): void`

Clears the in-memory cache of Why Is This Here results.

**Location:** `src/features/why-is-this-here/command.ts`

#### Hover Provider

##### `WhyIsThisHereHoverProvider`

VS Code hover provider for inline explanations.

**Location:** `src/features/why-is-this-here/provider.ts`

**Methods:**

###### `provideHover(document: TextDocument, position: Position): Promise<Hover | null>`

Provides hover content for a given position.

**Parameters:**
- `document` (TextDocument): Current document
- `position` (Position): Cursor position

**Returns:** `Promise<Hover | null>` - Hover content or null

**Example:**
```typescript
import { WhyIsThisHereHoverProvider } from './features/why-is-this-here/provider';

const provider = new WhyIsThisHereHoverProvider();
vscode.languages.registerHoverProvider('*', provider);
```

#### Git Utilities

##### `getGitHistory(filePath: string, startLine: number, endLine: number): Promise<GitCommit[]>`

Retrieves git history for a specific line range.

**Location:** `src/features/why-is-this-here/git.ts`

**Parameters:**
- `filePath` (string): Absolute path to file
- `startLine` (number): Start line (1-based)
- `endLine` (number): End line (1-based)

**Returns:** `Promise<GitCommit[]>` - Array of commits affecting the range

**Type Definition:**
```typescript
interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
  prNumber?: number;          // Extracted from commit message
  issueNumber?: number;       // Extracted from commit message
}
```

##### `getLinkedPRData(prNumber: number, repo: string): Promise<PRData | null>`

Fetches PR data from GitHub API.

**Parameters:**
- `prNumber` (number): PR number
- `repo` (string): Repository in format "owner/repo"

**Returns:** `Promise<PRData | null>` - PR data or null if not found

**Type Definition:**
```typescript
interface PRData {
  title: string;
  body: string;
  url: string;
  author: string;
  mergedAt: string;
}
```

#### Schema

##### `WhyIsThisHereSchema`

Zod schema for validating Bob's explanation response.

**Location:** `src/features/why-is-this-here/schema.ts`

**Type Definition:**
```typescript
interface WhyIsThisHereExplanation {
  summary: string;              // One-sentence summary
  businessReason: string;       // Why it exists
  technicalContext: string;     // How it works
  alternatives: string[];       // Other approaches considered
  references: Reference[];      // Links to PRs/issues
}

interface Reference {
  type: 'pr' | 'issue' | 'commit';
  number: number;
  url: string;
  title: string;
}
```

---

### Day-N Plan API

Generates personalized learning paths for onboarding.

**Location:** `src/features/day-n-plan/`

#### Command

##### `executeDayNPlan(provider: DayNPlanProvider): Promise<void>`

Main command handler for Day-N Plan generation.

**Location:** `src/features/day-n-plan/command.ts`

**Parameters:**
- `provider` (DayNPlanProvider): Tree view provider to update

**Behavior:**
1. Shows configuration quick pick
2. Collects user preferences (role, seniority, focus)
3. Analyzes repository
4. Generates 5-day plan via Bob
5. Updates tree view with results

#### Tree View Provider

##### `DayNPlanProvider`

VS Code tree data provider for displaying learning plans.

**Location:** `src/features/day-n-plan/provider.ts`

**Methods:**

###### `getTreeItem(element: PlanItem): TreeItem`

Converts plan item to VS Code tree item.

###### `getChildren(element?: PlanItem): Promise<PlanItem[]>`

Returns children for a given element (or root items).

###### `updatePlan(plan: DayNPlan): void`

Updates the tree view with a new plan.

###### `clearPlan(): void`

Clears the current plan from the tree view.

**Example:**
```typescript
import { DayNPlanProvider } from './features/day-n-plan/provider';

const provider = new DayNPlanProvider(context);
const treeView = vscode.window.createTreeView('onboard.dayNPlan', {
  treeDataProvider: provider
});
```

#### Configuration

##### `getDayNPlanConfig(): Promise<DayNPlanConfig>`

Shows quick pick UI to collect user preferences.

**Location:** `src/features/day-n-plan/config.ts`

**Returns:** `Promise<DayNPlanConfig>` - User configuration

**Type Definition:**
```typescript
interface DayNPlanConfig {
  role: 'backend' | 'frontend' | 'fullstack' | 'devops' | 'data' | 'mobile';
  seniority: 'junior' | 'mid' | 'senior' | 'staff';
  focusArea: 'architecture' | 'testing' | 'deployment' | 'performance' | 'security' | 'api';
}
```

#### Schema

##### `DayNPlanSchema`

Zod schema for validating Bob's learning plan response.

**Location:** `src/features/day-n-plan/schema.ts`

**Type Definition:**
```typescript
interface DayNPlan {
  overview: string;             // Plan summary
  days: Day[];                  // 5-day breakdown
}

interface Day {
  dayNumber: number;            // 1-5
  title: string;                // Day theme
  readingList: Reading[];       // Files to read
  keyConcept: string;           // Main learning goal
  task: Task;                   // Hands-on exercise
  resources: string[];          // Additional links
}

interface Reading {
  file: string;                 // File path
  purpose: string;              // Why read this
  order: number;                // Reading sequence
}

interface Task {
  description: string;
  hints: string[];
  expectedOutcome: string;
  validation: string;
}
```

---

### Starter Tasks API

Finds beginner-friendly tasks in the repository.

**Location:** `src/features/starter-tasks/`

#### Command

##### `executeFindStarterTasks(): Promise<void>`

Main command handler for finding starter tasks.

**Location:** `src/features/starter-tasks/command.ts`

**Behavior:**
1. Scans repository for TODO/FIXME comments
2. Analyzes test coverage
3. Identifies undocumented functions
4. Sends findings to Bob for task generation
5. Renders task cards as markdown
6. Opens in VS Code

#### Schema

##### `StarterTasksSchema`

Zod schema for validating Bob's task list response.

**Location:** `src/features/starter-tasks/schema.ts`

**Type Definition:**
```typescript
interface StarterTasksList {
  tasks: StarterTask[];
}

interface StarterTask {
  id: string;                   // Unique identifier
  title: string;                // Task name
  description: string;          // What to do
  context: string;              // Why it matters
  location: TaskLocation;       // Where in codebase
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;        // e.g., "15-20 minutes"
  hints: string[];              // Guidance
  expectedOutcome: string;      // Success criteria
  validation: string;           // How to verify
  tags: string[];               // Categories
}

interface TaskLocation {
  file: string;
  line?: number;
  function?: string;
}
```

#### Renderer

##### `renderStarterTasks(tasks: StarterTasksList): string`

Converts task list to formatted markdown.

**Location:** `src/features/starter-tasks/render.ts`

**Parameters:**
- `tasks` (StarterTasksList): Validated task list from Bob

**Returns:** `string` - Markdown document with task cards

---

## Prompt Templates

### Prompt Structure

All prompts follow a consistent three-section structure:

```typescript
function buildPrompt(context: any): string {
  return `
<role>
You are an expert software engineer analyzing a codebase.
</role>

<task>
${taskDescription}
</task>

<output_format>
Return a JSON object matching this schema:
${schemaDescription}
</output_format>
  `.trim();
}
```

### Prompt Utilities

**Location:** `src/prompts/`

#### `formatFileList(files: string[]): string`

Formats file paths for inclusion in prompts.

#### `formatCodeContext(code: string, language: string): string`

Formats code with syntax highlighting markers.

#### `buildSystemPrompt(role: string): string`

Constructs system-level instructions for Bob.

---

## Schema Definitions

All schemas use [Zod](https://github.com/colinhacks/zod) for runtime validation.

### Common Patterns

#### Optional Fields

```typescript
const schema = z.object({
  required: z.string(),
  optional: z.string().optional(),
});
```

#### Arrays

```typescript
const schema = z.object({
  items: z.array(z.string()),
});
```

#### Enums

```typescript
const schema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']),
});
```

#### Nested Objects

```typescript
const schema = z.object({
  nested: z.object({
    field: z.string(),
  }),
});
```

### Validation Helpers

#### `validateResponse<T>(data: unknown, schema: z.ZodSchema<T>): T`

Validates data against schema and returns typed result.

**Throws:** `z.ZodError` with detailed error information

**Example:**
```typescript
import { validateResponse } from './validation';
import { RepoXRaySchema } from './features/repo-xray/schema';

try {
  const validated = validateResponse(bobResponse, RepoXRaySchema);
  // validated is now typed as RepoXRayAnalysis
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation failed:', error.errors);
  }
}
```

---

## Extension Points

### Adding a New Feature

1. **Create feature directory:**
   ```
   src/features/my-feature/
   ├── command.ts
   ├── prompt.ts
   ├── schema.ts
   └── render.ts (optional)
   ```

2. **Implement command handler:**
   ```typescript
   // command.ts
   export async function executeMyFeature(): Promise<void> {
     const prompt = buildMyFeaturePrompt();
     const response = await askStructured(prompt, MyFeatureSchema);
     // Process response
   }
   ```

3. **Register in extension.ts:**
   ```typescript
   const myFeatureCommand = vscode.commands.registerCommand(
     'onboard.myFeature',
     executeMyFeature
   );
   context.subscriptions.push(myFeatureCommand);
   ```

4. **Add to package.json:**
   ```json
   {
     "contributes": {
       "commands": [
         {
           "command": "onboard.myFeature",
           "title": "Onboard: My Feature"
         }
       ]
     }
   }
   ```

### Custom Providers

#### Hover Provider

```typescript
class MyHoverProvider implements vscode.HoverProvider {
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | null> {
    // Implementation
  }
}

// Register
vscode.languages.registerHoverProvider('*', new MyHoverProvider());
```

#### Tree View Provider

```typescript
class MyTreeProvider implements vscode.TreeDataProvider<MyItem> {
  getTreeItem(element: MyItem): vscode.TreeItem {
    // Implementation
  }

  getChildren(element?: MyItem): Promise<MyItem[]> {
    // Implementation
  }
}

// Register
vscode.window.createTreeView('myView', {
  treeDataProvider: new MyTreeProvider()
});
```

---

## Testing Utilities

### Mock Bob Client

**Location:** `src/bob/test-client.ts`

#### `createMockBobClient(responses: Record<string, string>): BobClient`

Creates a mock Bob client for testing.

**Parameters:**
- `responses` (Record<string, string>): Map of prompt patterns to responses

**Example:**
```typescript
import { createMockBobClient } from './bob/test-client';

const mockClient = createMockBobClient({
  'analyze repository': JSON.stringify({ architecture: {...} }),
  'explain code': 'This code does X because Y',
});
```

### Test Helpers

**Location:** `src/test/helpers.ts`

#### `createTestWorkspace(files: Record<string, string>): Promise<string>`

Creates a temporary workspace with specified files.

#### `cleanupTestWorkspace(path: string): Promise<void>`

Removes temporary test workspace.

#### `mockGitHistory(commits: GitCommit[]): void`

Mocks git history for testing Why Is This Here.

---

## Error Handling

### Error Types

#### `BobAPIError`

Thrown when Bob API request fails.

```typescript
class BobAPIError extends Error {
  statusCode: number;
  response?: string;
}
```

#### `ValidationError`

Thrown when Bob response doesn't match schema.

```typescript
class ValidationError extends Error {
  zodError: z.ZodError;
}
```

### Error Recovery

All commands implement graceful error handling:

```typescript
try {
  await executeFeature();
} catch (error) {
  if (error instanceof BobAPIError) {
    vscode.window.showErrorMessage(
      `Bob API error: ${error.message}`
    );
  } else if (error instanceof ValidationError) {
    vscode.window.showErrorMessage(
      'Received invalid response from Bob. Please try again.'
    );
  } else {
    vscode.window.showErrorMessage(
      `Unexpected error: ${error.message}`
    );
  }
}
```

---

## Performance Considerations

### Caching

- **Why Is This Here:** Results cached per file:line
- **Repo X-Ray:** No caching (analysis should be fresh)
- **Day-N Plan:** Cached in tree view provider

### Rate Limiting

Bob client implements exponential backoff for rate limit errors:

```typescript
async function askWithRetry(
  prompt: string,
  maxRetries: number = 3
): Promise<string> {
  // Implementation with exponential backoff
}
```

### Memory Management

- Large file contents are streamed, not loaded entirely
- Git history limited to last 100 commits per file
- Tree views use lazy loading for large plans

---

## Security

### API Key Handling

- Never log API keys
- Never include in error messages
- Read from environment variables only
- Validate before use

### Input Sanitization

All user inputs are sanitized before sending to Bob:

```typescript
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')  // Remove HTML tags
    .trim()
    .slice(0, 10000);      // Limit length
}
```

### File Access

- Only read files within workspace
- Validate paths before access
- Never execute user-provided code

---

## Debugging

### Enable Debug Logging

Set environment variable:
```bash
export ONBOARD_DEBUG=true
```

### Debug Output

View debug logs in VS Code Output panel:
1. View → Output
2. Select "Onboard" from dropdown

### Common Issues

**Bob API not responding:**
- Check API key configuration
- Verify network connectivity
- Check Bob API status

**Schema validation failing:**
- Enable debug logging
- Check Bob response format
- Verify schema matches expected output

**Git commands failing:**
- Ensure repository has git history
- Check git is installed and in PATH
- Verify file is tracked by git

---

## Version Compatibility

### VS Code

- **Minimum:** 1.85.0
- **Recommended:** Latest stable

### Node.js

- **Minimum:** 20.x
- **Recommended:** 20.x LTS

### TypeScript

- **Version:** 5.3+
- **Target:** ES2022

---

## API Changelog

### v0.1.0 (Current)

- Initial API release
- Bob client with structured responses
- Four core features
- Zod schema validation
- Test utilities

### Future

- Streaming responses for large analyses
- Batch operations API
- Plugin system for custom features
- Webhook support for CI/CD integration

---

For more information, see:
- [Main README](README.md)
- [Extension README](onboard-extension/README.md)
- [Evaluation Guide](eval/README.md)
