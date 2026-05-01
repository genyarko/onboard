# Contributing to Onboard

Thank you for your interest in contributing to Onboard! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)
- [Feature Requests](#feature-requests)
- [Bug Reports](#bug-reports)

## Code of Conduct

This project follows a simple code of conduct:

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain a professional environment

## Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **VS Code** 1.85.0 or higher
- **Git** for version control
- **IBM Bob API** credentials (for testing features)

### First-Time Setup

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/onboard.git
   cd onboard
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/onboard.git
   ```

4. **Install dependencies:**
   ```bash
   cd onboard-extension
   npm install
   
   cd ../eval
   npm install
   ```

5. **Set up environment variables:**
   ```bash
   cp onboard-extension/.env.example onboard-extension/.env
   # Edit .env and add your BOB_API_KEY
   ```

6. **Compile the extension:**
   ```bash
   cd onboard-extension
   npm run compile
   ```

7. **Run tests:**
   ```bash
   npm test
   ```

## Development Setup

### VS Code Configuration

Recommended VS Code extensions:
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript and JavaScript Language Features** - Built-in

### Environment Variables

Create `onboard-extension/.env`:
```bash
BOB_API_KEY=your-api-key-here
BOB_API_ENDPOINT=https://api.bob.ibm.com/v1/chat  # Optional
```

### Running the Extension

1. Open `onboard-extension/` in VS Code
2. Press `F5` to launch Extension Development Host
3. Test your changes in the new window

## Project Structure

```
onboard/
├── onboard-extension/          # Main VS Code extension
│   ├── src/
│   │   ├── bob/               # Bob API client
│   │   ├── features/          # Feature implementations
│   │   │   ├── repo-xray/
│   │   │   ├── why-is-this-here/
│   │   │   ├── day-n-plan/
│   │   │   └── starter-tasks/
│   │   ├── prompts/           # Shared prompt utilities
│   │   └── test/              # Test suites
│   └── package.json
├── eval/                       # Evaluation harness
│   ├── faithfulness.ts
│   ├── completeness.ts
│   └── ground-truth/
├── fastapi-demo/              # Demo repository
└── docs/                      # Documentation
```

## Development Workflow

### Branch Strategy

- `main` - Stable, production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Creating a Feature Branch

```bash
# Update your local main
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/my-new-feature
```

### Making Changes

1. **Write code** following our [coding standards](#coding-standards)
2. **Add tests** for new functionality
3. **Update documentation** if needed
4. **Run tests** to ensure nothing breaks
5. **Commit changes** with clear messages

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**
```
feat(repo-xray): add support for monorepo analysis

Implements multi-root workspace detection and generates
separate architecture diagrams for each root.

Closes #123
```

```
fix(why-is-this-here): handle files without git history

Falls back to file-level analysis when line-specific
git history is unavailable.
```

## Coding Standards

### TypeScript

- **Strict mode enabled** - No `any` without justification
- **Explicit types** - Avoid type inference for public APIs
- **Async/await** - Prefer over Promise chains
- **Error handling** - Always handle errors gracefully

### Code Style

We use ESLint and Prettier for consistent formatting:

```bash
# Check linting
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

**Key conventions:**
- **Indentation:** 2 spaces
- **Quotes:** Single quotes for strings
- **Semicolons:** Required
- **Line length:** 100 characters max
- **Naming:**
  - `camelCase` for variables and functions
  - `PascalCase` for classes and types
  - `UPPER_SNAKE_CASE` for constants

### File Organization

Each feature should follow this structure:

```
features/my-feature/
├── command.ts       # VS Code command handler
├── prompt.ts        # Bob prompt templates
├── schema.ts        # Zod validation schemas
├── provider.ts      # VS Code provider (if needed)
└── utils.ts         # Feature-specific utilities
```

### Prompt Engineering

All prompts must follow the three-section structure:

```typescript
export function buildMyPrompt(context: Context): string {
  return `
<role>
You are an expert software engineer...
</role>

<task>
${taskDescription}
</task>

<output_format>
Return a JSON object matching this schema:
${JSON.stringify(schema, null, 2)}
</output_format>
  `.trim();
}
```

### Schema Definitions

Use Zod for all structured outputs:

```typescript
import { z } from 'zod';

export const MyFeatureSchema = z.object({
  field1: z.string(),
  field2: z.number().optional(),
  nested: z.object({
    subfield: z.array(z.string()),
  }),
});

export type MyFeature = z.infer<typeof MyFeatureSchema>;
```

## Testing Guidelines

### Test Structure

Tests are located in `src/test/suite/`:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { myFunction } from '../../features/my-feature/utils';

suite('My Feature Test Suite', () => {
  test('should do something', async () => {
    const result = await myFunction();
    assert.strictEqual(result, expectedValue);
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "My Feature"

# Watch mode
npm run watch
```

### Test Coverage

Aim for:
- **Unit tests** - All utility functions
- **Integration tests** - Feature commands
- **E2E tests** - Full workflows

### Mocking Bob API

Use the test client for mocking:

```typescript
import { createMockBobClient } from '../../bob/test-client';

const mockClient = createMockBobClient({
  'analyze repository': JSON.stringify({ architecture: {...} }),
});
```

## Submitting Changes

### Pull Request Process

1. **Update your branch:**
   ```bash
   git checkout main
   git pull upstream main
   git checkout feature/my-feature
   git rebase main
   ```

2. **Push to your fork:**
   ```bash
   git push origin feature/my-feature
   ```

3. **Create Pull Request** on GitHub

4. **Fill out PR template:**
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (if UI changes)

5. **Wait for review** - Address feedback promptly

### PR Checklist

Before submitting, ensure:

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] No console.log or debug code
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without warnings

### Review Process

1. **Automated checks** run (tests, linting)
2. **Code review** by maintainers
3. **Feedback addressed** by contributor
4. **Approval** from at least one maintainer
5. **Merge** to develop branch

## Feature Requests

### Before Submitting

1. **Check existing issues** - Avoid duplicates
2. **Search discussions** - May already be planned
3. **Consider scope** - Should fit project goals

### Creating a Feature Request

Use the feature request template:

```markdown
## Feature Description
Clear description of the feature

## Use Case
Why is this feature needed?

## Proposed Solution
How should it work?

## Alternatives Considered
Other approaches you've thought about

## Additional Context
Screenshots, mockups, examples
```

## Bug Reports

### Before Submitting

1. **Update to latest version** - Bug may be fixed
2. **Check existing issues** - May already be reported
3. **Reproduce consistently** - Ensure it's not a one-off

### Creating a Bug Report

Use the bug report template:

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Windows 11]
- VS Code version: [e.g., 1.85.0]
- Extension version: [e.g., 0.1.0]
- Node.js version: [e.g., 20.10.0]

## Additional Context
Logs, screenshots, error messages
```

### Debug Information

Include relevant logs from:
- VS Code Output panel (Onboard channel)
- VS Code Developer Tools Console
- Extension Host logs

## Development Tips

### Debugging

1. **Set breakpoints** in VS Code
2. **Press F5** to launch debugger
3. **Trigger feature** in Extension Development Host
4. **Inspect variables** at breakpoints

### Performance Profiling

```typescript
console.time('operation');
await myOperation();
console.timeEnd('operation');
```

### Testing with Different Repositories

Test your changes on various repositories:
- Small repos (< 100 files)
- Medium repos (100-1000 files)
- Large repos (> 1000 files)
- Monorepos
- Repos without git history

### Common Pitfalls

1. **Forgetting to compile** - Run `npm run compile` after changes
2. **Not handling errors** - Always add try-catch blocks
3. **Hardcoding paths** - Use `vscode.workspace.workspaceFolders`
4. **Blocking the UI** - Use async operations
5. **Not validating Bob responses** - Always use Zod schemas

## Getting Help

### Resources

- **Documentation:** [README.md](README.md), [API.md](API.md)
- **Examples:** Check existing features for patterns
- **VS Code API:** [VS Code Extension API](https://code.visualstudio.com/api)
- **TypeScript:** [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Communication

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and ideas
- **Pull Request Comments** - Code-specific discussions

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

Thank you for contributing to Onboard! 🚀

---

**Questions?** Open an issue or start a discussion on GitHub.
