# ADR-005: Git History as Primary Context Source

## Status
Accepted

## Date
2026-04-20

## Context

The "Why Is This Here?" feature needs to explain the business reasoning behind code, not just what it does. To provide meaningful explanations, we need historical context about:

- Why the code was written
- What problem it solved
- What alternatives were considered
- What discussions led to the decision

We evaluated several approaches for gathering this context:

1. **Code comments only** - Limited to what developers documented
2. **Static analysis only** - Can explain what code does, but not why
3. **Git history + linked issues/PRs** - Rich historical context
4. **External documentation** - Often outdated or incomplete

## Decision

We will use **git history as the primary context source** for the "Why Is This Here?" feature, supplemented with:

- Linked GitHub/GitLab PR descriptions
- Linked issue discussions
- Commit messages
- Code comments (as secondary source)

The implementation:

1. Use `git blame` to find commits that modified specific lines
2. Extract commit messages and metadata
3. Parse PR/issue references from commit messages (e.g., `#123`, `fixes #456`)
4. Fetch PR/issue data via GitHub/GitLab API when available
5. Synthesize all sources into a coherent explanation via IBM Bob

## Consequences

### Positive

- **Rich Context**: Git history provides authentic historical reasoning
- **Verifiable**: All explanations can be traced to actual commits/PRs
- **Automatic**: No manual documentation required
- **Evolves with Code**: Context stays current as code changes
- **Multi-Source Synthesis**: Bob can combine git + PR + issue data

### Negative

- **Requires Git Repository**: Feature won't work on non-git codebases
- **Shallow Clones**: Limited history in shallow clones reduces context
- **Commit Message Quality**: Depends on developers writing good messages
- **API Rate Limits**: GitHub/GitLab API calls may hit rate limits
- **Performance**: Git operations can be slow on large repositories

### Mitigations

1. **Fallback Mode**: Provide code-only analysis when git history unavailable
2. **Caching**: Cache git history and PR data to reduce API calls
3. **Confidence Scoring**: Label explanations with confidence level based on available context
4. **User Guidance**: Encourage teams to write meaningful commit messages
5. **Shallow Clone Detection**: Warn users and suggest `git fetch --unshallow`

## Alternatives Considered

### Alternative 1: Code Comments Only

**Pros:**
- No external dependencies
- Fast and simple
- Works without git

**Cons:**
- Limited context
- Often outdated
- Inconsistent coverage
- No business reasoning

**Rejected because:** Comments rarely explain business decisions and are often outdated.

### Alternative 2: Static Analysis Only

**Pros:**
- No git required
- Fast analysis
- Works on any codebase

**Cons:**
- Can only explain "what", not "why"
- No historical context
- No business reasoning
- Limited value for onboarding

**Rejected because:** Doesn't address the core problem of understanding business context.

### Alternative 3: External Documentation

**Pros:**
- Comprehensive when available
- Human-curated
- May include architecture diagrams

**Cons:**
- Often outdated
- Requires manual maintenance
- Not linked to specific code
- Inconsistent across projects

**Rejected because:** Documentation is rarely kept in sync with code changes.

### Alternative 4: Developer Interviews

**Pros:**
- Most accurate context
- Can clarify ambiguities
- Captures tribal knowledge

**Cons:**
- Not scalable
- Requires developer availability
- Can't be automated
- Knowledge lost when developers leave

**Rejected because:** Not automatable and doesn't scale.

## Implementation Details

### Git History Extraction

```typescript
// src/features/why-is-this-here/git.ts
export async function getGitHistory(
  filePath: string,
  startLine: number,
  endLine: number
): Promise<GitCommit[]> {
  // Use git blame to find commits
  const blameOutput = await execGit([
    'blame',
    '-L', `${startLine},${endLine}`,
    '--porcelain',
    filePath
  ]);
  
  // Parse commit hashes
  const commits = parseBlameOutput(blameOutput);
  
  // Get full commit details
  return Promise.all(
    commits.map(hash => getCommitDetails(hash))
  );
}
```

### PR/Issue Linking

```typescript
// Extract PR/issue references from commit messages
function extractReferences(message: string): Reference[] {
  const prPattern = /#(\d+)/g;
  const fixesPattern = /(?:fixes|closes|resolves)\s+#(\d+)/gi;
  
  // Extract all references
  const refs: Reference[] = [];
  
  // ... parsing logic
  
  return refs;
}
```

### Confidence Scoring

```typescript
interface Explanation {
  summary: string;
  businessReason: string;
  confidence: 'high' | 'medium' | 'low';
}

function calculateConfidence(context: Context): Confidence {
  if (context.linkedPRs.length > 0) return 'high';
  if (context.commits.length > 3) return 'medium';
  return 'low';
}
```

## Related ADRs

- [ADR-001: Use IBM Bob for Full Repository Context](001-use-bob-for-full-repo-context.md) - Bob synthesizes git history
- [ADR-003: Structured Outputs with Zod](003-structured-outputs-with-zod.md) - Validates explanation format

## References

- [Git Blame Documentation](https://git-scm.com/docs/git-blame)
- [GitHub API - Pull Requests](https://docs.github.com/en/rest/pulls)
- [Conventional Commits](https://www.conventionalcommits.org/) - Commit message format

## Review Notes

- Approved by: Engineering Team
- Implementation: Complete
- Evaluation: See `eval/faithfulness.ts` for accuracy metrics
