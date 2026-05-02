# Architecture Decision Records (ADRs)

> Documentation of significant architectural decisions made in the Onboard project

## What are ADRs?

Architecture Decision Records (ADRs) are documents that capture important architectural decisions made along with their context and consequences. They help teams understand:

- **Why** certain decisions were made
- **What** alternatives were considered
- **When** the decision was made
- **Who** was involved
- **What** the consequences are

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](001-use-bob-for-full-repo-context.md) | Use IBM Bob for Full Repository Context | Accepted | 2026-04-15 |
| [002](002-four-stage-repo-xray-pipeline.md) | Four-Stage Repo X-Ray Pipeline | Accepted | 2026-04-16 |
| [003](003-structured-outputs-with-zod.md) | Structured Outputs with Zod Validation | Accepted | 2026-04-17 |
| [004](004-native-vscode-integration.md) | Native VS Code Integration Over Custom UI | Accepted | 2026-04-18 |
| [005](005-git-history-for-context.md) | Git History as Primary Context Source | Accepted | 2026-04-20 |
| [006](006-evaluation-harness.md) | Quantitative Evaluation Harness | Accepted | 2026-04-22 |
| [007](007-prompt-isolation.md) | Prompt Isolation in Separate Files | Accepted | 2026-04-23 |
| [005](005-git-history-for-context.md) | Git History as Primary Context Source | Accepted | 2026-04-20 |
| [006](006-evaluation-harness.md) | Quantitative Evaluation Harness | Accepted | 2026-04-22 |
| [007](007-prompt-isolation.md) | Prompt Isolation in Separate Files | Accepted | 2026-04-23 |

## ADR Format

Each ADR follows this structure:

```markdown
# ADR-XXX: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
What is the issue we're facing? What factors are at play?

## Decision
What decision did we make?

## Consequences
What are the positive and negative consequences of this decision?

## Alternatives Considered
What other options did we evaluate?
```

## Creating a New ADR

1. Copy the template: `cp template.md XXX-title.md`
2. Fill in the sections
3. Submit for review
4. Update this index when accepted

## ADR Lifecycle

- **Proposed**: Under discussion
- **Accepted**: Decision made and implemented
- **Deprecated**: No longer relevant
- **Superseded**: Replaced by a newer ADR

## Related Resources

- [ADR GitHub Organization](https://adr.github.io/)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR Tools](https://github.com/npryce/adr-tools)
