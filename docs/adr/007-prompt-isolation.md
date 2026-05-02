# ADR-007: Prompt Isolation in Separate Files

## Status
Accepted

## Date
2026-04-23

## Context

In AI-powered applications, prompts are critical components that directly affect output quality. However, prompts are often embedded directly in code, leading to several problems:

1. **Hard to Maintain**: Prompts scattered across codebase are difficult to find and update
2. **Version Control Issues**: Changes to prompts mixed with code changes in commits
3. **Testing Challenges**: Can't easily test different prompt variations
4. **Collaboration Friction**: Non-technical stakeholders can't review or suggest prompt improvements
5. **Reusability**: Difficult to share prompts across features or projects
6. **Documentation**: Prompt logic not clearly documented

For the Onboard extension, we have multiple complex prompts:
- Repo X-Ray (4-stage pipeline with different prompts per stage)
- Why Is This Here (with fallback variants)
- Day-N Plan (with role/seniority customization)
- Starter Tasks (with filtering logic)

These prompts need frequent iteration and refinement based on:
- User feedback
- Evaluation results
- New use cases
- Model updates

## Decision

We will **isolate all prompts in dedicated files** separate from command logic:

### File Structure

```
src/features/
├── repo-xray/
│   ├── command.ts       # Command handler (no prompts)
│   ├── prompt.ts        # All prompts for this feature
│   ├── schema.ts        # Output validation
│   └── render.ts        # UI rendering
├── why-is-this-here/
│   ├── command.ts
│   ├── prompt.ts        # Main + fallback prompts
│   ├── provider.ts
│   └── schema.ts
└── ...
```

### Prompt File Pattern

Each `prompt.ts` file exports:

1. **Builder Functions**: Functions that construct prompts from context
2. **Context Interfaces**: TypeScript interfaces for prompt inputs
3. **Documentation**: JSDoc comments explaining prompt purpose and usage

```typescript
// src/features/repo-xray/prompt.ts

/**
 * Builds the Stage 1 prompt for identifying repository entry points.
 * 
 * @param context - Repository context including file tree and metadata
 * @returns Formatted prompt string for IBM Bob
 * 
 * @example
 * const prompt = buildEntryPointsPrompt({
 *   repositoryPath: '/path/to/repo',
 *   fileTree: '...',
 *   packageJson: '...'
 * });
 */
export function buildEntryPointsPrompt(context: RepoContext): string {
  return `<role>
You are a senior software architect...
</role>

<task>
Analyze the repository and identify entry points...
</task>`;
}

export interface RepoContext {
  repositoryPath: string;
  repositoryName: string;
  fileTree: string;
  packageJson?: string;
  readme?: string;
}
```

### Separation of Concerns

**Command Files (`command.ts`):**
- Handle VS Code integration
- Gather context
- Call prompt builders
- Send to Bob client
- Validate responses
- Render outputs

**Prompt Files (`prompt.ts`):**
- Define prompt structure
- Format context for AI
- Specify output requirements
- Document prompt logic

**Example:**
```typescript
// command.ts
import { buildRepoXRayPrompt } from './prompt';
import { askStructured } from '../../bob/client';
import { RepoXRaySchema } from './schema';

export async function executeRepoXRay(): Promise<void> {
  // Gather context
  const context = await gatherRepoContext();
  
  // Build prompt (isolated in prompt.ts)
  const prompt = buildRepoXRayPrompt(context);
  
  // Send to Bob
  const response = await askStructured(prompt, RepoXRaySchema);
  
  // Render output
  await renderRepoXRay(response);
}
```

## Consequences

### Positive

1. **Easy Maintenance**: All prompts in one place per feature
2. **Clear Ownership**: Prompt changes don't affect command logic
3. **Better Testing**: Can test prompts independently
4. **Version Control**: Prompt changes clearly visible in git history
5. **Collaboration**: Non-developers can review prompt files
6. **Reusability**: Easy to share prompts across features
7. **Documentation**: Prompts serve as feature documentation
8. **A/B Testing**: Easy to test prompt variations
9. **Debugging**: Can log prompts without code context
10. **Prompt Library**: Can build shared prompt utilities

### Negative

1. **Extra Files**: More files to navigate
2. **Indirection**: One more hop to understand full flow
3. **Import Management**: Need to import prompt builders
4. **Duplication Risk**: Similar prompts might be duplicated

### Mitigations

1. **Consistent Naming**: Always use `prompt.ts` for prompt files
2. **Clear Documentation**: JSDoc on every prompt builder
3. **Shared Utilities**: Create `src/prompts/` for common patterns
4. **Code Navigation**: Use IDE "Go to Definition" for quick access
5. **Prompt Templates**: Create reusable prompt components

## Implementation Details

### Shared Prompt Utilities

```typescript
// src/prompts/formatting.ts

export function formatFileTree(tree: string): string {
  return `<file_tree>\n${tree}\n</file_tree>`;
}

export function formatCodeContext(code: string, language: string): string {
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

export function buildOutputFormat(schema: object): string {
  return `<output_format>
CRITICAL: Return ONLY a valid JSON object matching this schema:
${JSON.stringify(schema, null, 2)}
</output_format>`;
}
```

### Prompt Composition

```typescript
// src/features/repo-xray/prompt.ts
import { formatFileTree, buildOutputFormat } from '../../prompts/formatting';

export function buildRepoXRayPrompt(context: RepoContext): string {
  const role = `<role>You are a senior software architect...</role>`;
  const task = `<task>Analyze the repository...</task>`;
  const fileTree = formatFileTree(context.fileTree);
  const outputFormat = buildOutputFormat(RepoXRaySchema);
  
  return [role, task, fileTree, outputFormat].join('\n\n');
}
```

### Prompt Versioning

```typescript
// Track prompt versions for evaluation
export const PROMPT_VERSION = '1.2.0';

export function buildRepoXRayPrompt(context: RepoContext): string {
  const prompt = `...`;
  
  // Include version in metadata (for logging/debugging)
  return prompt;
}
```

### Testing Prompts

```typescript
// src/features/repo-xray/prompt.test.ts
import { buildRepoXRayPrompt } from './prompt';

describe('buildRepoXRayPrompt', () => {
  it('includes repository name', () => {
    const prompt = buildRepoXRayPrompt({
      repositoryName: 'test-repo',
      // ...
    });
    
    expect(prompt).toContain('test-repo');
  });
  
  it('formats file tree correctly', () => {
    const prompt = buildRepoXRayPrompt({
      fileTree: 'src/\n  main.ts',
      // ...
    });
    
    expect(prompt).toContain('<file_tree>');
  });
});
```

## Alternatives Considered

### Alternative 1: Inline Prompts

**Approach:** Keep prompts as string literals in command files

```typescript
// command.ts
export async function executeRepoXRay(): Promise<void> {
  const prompt = `<role>You are a senior architect...</role>
  <task>Analyze ${repoName}...</task>`;
  
  const response = await ask(prompt);
}
```

**Pros:**
- Fewer files
- Everything in one place
- No imports needed

**Cons:**
- Hard to maintain
- Difficult to test
- Poor version control
- Can't reuse prompts
- Clutters command logic

**Rejected because:** Doesn't scale as prompts grow in complexity.

### Alternative 2: Centralized Prompt File

**Approach:** Single `prompts.ts` file for all features

```typescript
// src/prompts.ts
export const REPO_XRAY_PROMPT = `...`;
export const WHY_IS_THIS_HERE_PROMPT = `...`;
export const DAY_N_PLAN_PROMPT = `...`;
```

**Pros:**
- All prompts in one file
- Easy to find
- Simple imports

**Cons:**
- File becomes huge
- Merge conflicts
- No feature isolation
- Hard to navigate
- Tight coupling

**Rejected because:** Doesn't scale and creates a monolithic file.

### Alternative 3: Database/Config Storage

**Approach:** Store prompts in database or config files

```json
// prompts.json
{
  "repoXRay": {
    "stage1": "...",
    "stage2": "..."
  }
}
```

**Pros:**
- Can update without code changes
- Centralized management
- Easy to version

**Cons:**
- Adds complexity
- Requires runtime loading
- Harder to type-check
- Difficult to compose
- No IDE support

**Rejected because:** Over-engineered for current needs.

### Alternative 4: Template Strings with Imports

**Approach:** Use template literals with imported fragments

```typescript
// fragments.ts
export const ROLE_ARCHITECT = `<role>You are a senior architect...</role>`;

// command.ts
import { ROLE_ARCHITECT } from './fragments';
const prompt = `${ROLE_ARCHITECT}\n<task>...</task>`;
```

**Pros:**
- Reusable fragments
- Composition flexibility
- Type-safe

**Cons:**
- Fragmented prompts
- Hard to see full prompt
- Complex imports
- Difficult to maintain

**Rejected because:** Makes prompts harder to understand as a whole.

## Migration Strategy

### Phase 1: Extract Existing Prompts (Complete)

1. Create `prompt.ts` files for each feature
2. Move inline prompts to builder functions
3. Update imports in command files
4. Add JSDoc documentation

### Phase 2: Standardize Format (Complete)

1. Consistent function naming: `build<Feature>Prompt`
2. Consistent context interfaces
3. Shared utilities in `src/prompts/`
4. Documentation in PROMPTS.md

### Phase 3: Testing & Validation (In Progress)

1. Add unit tests for prompt builders
2. Validate prompt outputs
3. A/B test prompt variations
4. Update evaluation harness

### Phase 4: Continuous Improvement (Ongoing)

1. Iterate based on evaluation results
2. Collect user feedback
3. Refine prompts for accuracy
4. Document best practices

## Related ADRs

- [ADR-001: Use IBM Bob for Full Repository Context](001-use-bob-for-full-repo-context.md) - Bob requires well-structured prompts
- [ADR-003: Structured Outputs with Zod](003-structured-outputs-with-zod.md) - Prompts specify output schemas
- [ADR-006: Evaluation Harness](006-evaluation-harness.md) - Isolated prompts enable A/B testing

## Best Practices

### 1. Clear Function Names

```typescript
// Good
export function buildRepoXRayPrompt(context: RepoContext): string

// Bad
export function getPrompt(ctx: any): string
```

### 2. Typed Context

```typescript
// Good
export interface RepoContext {
  repositoryPath: string;
  fileTree: string;
}

// Bad
export function buildPrompt(context: any): string
```

### 3. Documentation

```typescript
/**
 * Builds prompt for X feature.
 * 
 * @param context - Repository context
 * @returns Formatted prompt string
 * 
 * @example
 * const prompt = buildPrompt({ ... });
 */
```

### 4. Composition

```typescript
// Good - compose from utilities
const prompt = [
  buildRole(),
  buildTask(context),
  formatFileTree(context.fileTree),
  buildOutputFormat(schema)
].join('\n\n');

// Bad - monolithic string
const prompt = `<role>...</role><task>...</task>...`;
```

### 5. Version Tracking

```typescript
export const PROMPT_VERSION = '1.0.0';
// Update version when prompt changes significantly
```

## Future Enhancements

1. **Prompt Registry**: Central registry of all prompts with metadata
2. **Prompt Analytics**: Track which prompts perform best
3. **Dynamic Prompts**: Adjust prompts based on repository characteristics
4. **Prompt Templates**: Reusable templates for common patterns
5. **Multi-Language Support**: Localized prompts for different languages
6. **Prompt Optimization**: Automated prompt refinement based on results

## References

- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [OpenAI Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)
- [Anthropic Prompt Library](https://docs.anthropic.com/claude/prompt-library)
- [PROMPTS.md Documentation](../../PROMPTS.md)

## Review Notes

- Approved by: Engineering Team
- Implementation: Complete
- All prompts migrated to separate files
- Documentation complete in PROMPTS.md
- Next Review: 2026-07-01
