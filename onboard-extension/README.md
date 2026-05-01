# Onboard VS Code Extension

> AI-powered codebase onboarding assistant that helps engineers ramp up on unfamiliar codebases quickly.

## Overview

Onboard is a VS Code extension powered by IBM Bob that transforms the overwhelming experience of joining a new codebase into a structured, guided journey. Instead of spending weeks deciphering code and asking senior engineers for context, new team members can:

- Generate instant architecture maps
- Understand the "why" behind any line of code
- Follow personalized learning paths
- Start contributing with curated beginner tasks

## Features

### 🔍 Repo X-Ray

**Command:** `Onboard: X-Ray Repository`

Analyzes your entire codebase and generates a comprehensive architecture document in ~30 seconds.

**What You Get:**
- **Architecture Diagram** - Visual representation of system layers and dependencies (Mermaid format)
- **Critical Path Narrative** - Step-by-step explanation of how data flows through the application
- **Conventions Cheat Sheet** - Coding patterns, naming conventions, and architectural decisions
- **Weird Parts Detection** - Identifies code that contradicts established patterns with explanations

**How It Works:**
1. Bob scans the entire repository
2. Identifies entry points (main files, app initialization, route definitions)
3. Walks the dependency graph from each entry point
4. Detects patterns and conventions
5. Flags code that doesn't follow the patterns
6. Generates a single markdown file with all findings

**Output Location:** Opens in VS Code preview as `repo-xray-analysis.md`

**Best For:**
- First day on a new project
- Understanding legacy codebases
- Preparing for code reviews
- Documenting undocumented systems

### 🤔 Why Is This Here?

**Command:** `Onboard: Why Is This Here?` (right-click any line)

Explains the business reasoning behind code, not just what it does.

**What You Get:**
- Historical context from git commits
- Links to original PRs and issues
- Business justification for the implementation
- Alternative approaches that were considered

**Example:**

```python
# Code:
if tenant_id is None:
    return []

# Why Is This Here explanation:
This guard was added in PR #4521 to fix a security bug where queries 
could leak across tenants when the auth middleware failed silently. 
The team chose to return empty rather than raise an exception because 
the dashboard was crashing for free-tier users who had incomplete 
auth setup. See issue #4502 for the original bug report.
```

**How It Works:**
1. Captures the selected line and surrounding context (±30 lines)
2. Runs `git log -L` to get commit history for that specific line range
3. Fetches linked PR/issue descriptions from GitHub
4. Bob synthesizes all sources into a coherent explanation

**Best For:**
- Understanding non-obvious code
- Learning from past decisions
- Avoiding repeated mistakes
- Code review preparation

**Cache:** Results are cached per line to avoid redundant API calls. Clear cache with `Onboard: Clear Why-Is-This-Here Cache`

### 📅 Day-N Plan

**Command:** `Onboard: Generate 5-Day Plan`

Creates a personalized 5-day learning path tailored to your role and experience level.

**Configuration Options:**
- **Role:** Backend, Frontend, Full-Stack, DevOps, Data Engineer, Mobile
- **Seniority:** Junior, Mid-Level, Senior, Staff+
- **Focus Area:** Architecture, Testing, Deployment, Performance, Security, API Design

**What You Get:**

Each day includes:
- **Reading List** - Specific files to read, in recommended order
- **Key Concept** - One main idea to internalize
- **Hands-On Task** - Practical exercise with validation criteria
- **Resources** - Links to relevant documentation or starter tasks

**Example Day 2 (Backend, Mid-Level, Focus: Architecture):**
```
📖 Reading List:
  - src/core/dependencies.py (dependency injection system)
  - src/api/routes/users.py (example route implementation)
  - src/middleware/auth.py (authentication flow)

💡 Key Concept: Dependency Injection Pattern
  Understand how FastAPI's dependency injection system works and why
  it's used for database connections, authentication, and configuration.

🎯 Task: Add a new authenticated endpoint
  Create a new route that requires authentication and uses dependency
  injection for database access. Write tests to verify behavior.

🔗 Resources:
  - Starter Task: "Add missing test for user creation endpoint"
  - FastAPI Docs: Dependencies
```

**How It Works:**
1. User configures role, seniority, and focus area
2. Bob analyzes the repository structure
3. Identifies key files and concepts for the specified role
4. Creates a progressive learning sequence
5. Links to relevant starter tasks for hands-on practice

**Output Location:** Interactive tree view in the Explorer sidebar

**Best For:**
- Structured onboarding
- Self-paced learning
- Reducing time to first PR
- Consistent team onboarding

### 🎯 Starter Tasks

**Command:** `Onboard: Find Starter Tasks`

Discovers beginner-friendly work in the repository that's perfect for first contributions.

**What You Get:**

Task cards with:
- **Description** - What needs to be done
- **Context** - Why it matters
- **Hints** - Guidance on approach
- **Expected Outcome** - What success looks like
- **Validation** - How to verify your solution
- **Difficulty** - Estimated complexity (Easy, Medium, Hard)

**Task Sources:**
- TODO/FIXME comments in code
- Missing test coverage
- Undocumented functions
- Simple bug fixes
- Code quality improvements

**Example Task:**
```markdown
## Task: Add missing docstring to `validate_email` function

**Location:** `src/utils/validators.py:45`

**Context:**
The `validate_email` function is used throughout the codebase but lacks
documentation. New developers often misunderstand its behavior with
edge cases.

**Hints:**
- Check how the function is used in tests
- Document the regex pattern used
- Explain what constitutes a valid email
- Note any known limitations

**Expected Outcome:**
A clear docstring following the project's documentation style (Google
format) that explains parameters, return value, and edge cases.

**Validation:**
Run `npm run lint:docs` to verify docstring format.

**Difficulty:** Easy
**Estimated Time:** 15-20 minutes
```

**How It Works:**
1. Bob scans the repository for TODO/FIXME comments
2. Analyzes test coverage to find untested code
3. Identifies functions without documentation
4. Ranks tasks by difficulty and impact
5. Generates detailed task cards

**Output Location:** Opens as `starter-tasks.md` in VS Code

**Best For:**
- First contributions
- Building confidence
- Learning the codebase
- Quick wins

## Installation

### Prerequisites

- **Node.js** 20.x or higher
- **VS Code** 1.85.0 or higher
- **IBM Bob API** credentials
- **Git** (for Why-Is-This-Here feature)

### Setup

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd onboard/onboard-extension
   npm install
   ```

2. **Configure IBM Bob:**

   Set your API key as an environment variable:

   **Windows (PowerShell):**
   ```powershell
   $env:BOB_API_KEY = "your-api-key-here"
   # Optional: custom endpoint
   $env:BOB_API_ENDPOINT = "https://api.bob.ibm.com/v1/chat"
   ```

   **Windows (Command Prompt):**
   ```cmd
   set BOB_API_KEY=your-api-key-here
   set BOB_API_ENDPOINT=https://api.bob.ibm.com/v1/chat
   ```

   **macOS/Linux:**
   ```bash
   export BOB_API_KEY="your-api-key-here"
   export BOB_API_ENDPOINT="https://api.bob.ibm.com/v1/chat"
   ```

3. **Compile the extension:**
   ```bash
   npm run compile
   ```

4. **Launch in development mode:**
   - Open this folder in VS Code
   - Press `F5` to launch Extension Development Host
   - Open a project folder in the new window

### Installation from VSIX (Production)

```bash
# Package the extension
npm run vscode:prepublish
vsce package

# Install the .vsix file
code --install-extension onboard-0.0.1.vsix
```

## Usage

### First-Time Setup

1. **Open a repository** you want to analyze
2. **Run Repo X-Ray** to get an overview:
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Type: `Onboard: X-Ray Repository`
   - Wait for analysis to complete
3. **Review the architecture document** that opens
4. **Generate your learning plan**:
   - Open the "Day-N Plan" sidebar
   - Click the calendar icon
   - Configure your preferences

### Daily Workflow

1. **Follow your Day-N Plan** - Check the sidebar for today's tasks
2. **Use Why-Is-This-Here** - Right-click confusing code for context
3. **Work on Starter Tasks** - Build confidence with guided exercises
4. **Re-run X-Ray** - Update your understanding as you learn

### Tips for Best Results

**Repo X-Ray:**
- Run on repositories with clear entry points (main.py, app.ts, etc.)
- Works best on codebases with 100-10,000 files
- Re-run after major refactors to update the analysis

**Why-Is-This-Here:**
- Most effective on code with rich git history
- Requires GitHub/GitLab for PR/issue linking
- Cache results to avoid redundant API calls

**Day-N Plan:**
- Be honest about your seniority level for best results
- Focus on one area at a time
- Complete tasks before moving to the next day

**Starter Tasks:**
- Start with "Easy" difficulty tasks
- Read the full context before beginning
- Use hints if you get stuck

## Configuration

### Extension Settings

Currently, all configuration is done via environment variables. Future versions will add VS Code settings.

**Available Environment Variables:**
- `BOB_API_KEY` - Your IBM Bob API key (required)
- `BOB_API_ENDPOINT` - Custom Bob API endpoint (optional)

### Workspace Settings

Add to `.vscode/settings.json` in your project:

```json
{
  "onboard.autoRunXRay": false,
  "onboard.cacheWhyIsThisHere": true,
  "onboard.defaultRole": "backend",
  "onboard.defaultSeniority": "mid"
}
```

## Troubleshooting

### "Bob API key not configured"

**Solution:** Set the `BOB_API_KEY` environment variable before launching VS Code.

### "Git history not available"

**Solution:** Ensure you're in a git repository with commit history. Why-Is-This-Here requires git.

### "Analysis taking too long"

**Solution:** 
- Repo X-Ray can take 30-60 seconds on large repositories
- Check your internet connection
- Verify Bob API is accessible

### "No starter tasks found"

**Solution:**
- Repository might not have TODO/FIXME comments
- Try running on a different repository
- Check that the repository has test files

### Extension not activating

**Solution:**
1. Check VS Code version (must be 1.85.0+)
2. Verify extension is compiled: `npm run compile`
3. Check Output panel for errors: View → Output → Onboard

## Development

### Project Structure

```
src/
├── extension.ts              # Entry point
├── bob/
│   ├── client.ts            # Bob API client
│   └── test-client.ts       # Mock client for testing
├── features/
│   ├── repo-xray/
│   │   ├── command.ts       # Command handler
│   │   ├── prompt.ts        # Bob prompt
│   │   ├── schema.ts        # Output validation
│   │   └── render.ts        # Markdown generation
│   ├── why-is-this-here/
│   │   ├── command.ts
│   │   ├── prompt.ts
│   │   ├── provider.ts      # Hover provider
│   │   ├── schema.ts
│   │   └── git.ts           # Git utilities
│   ├── day-n-plan/
│   │   ├── command.ts
│   │   ├── prompt.ts
│   │   ├── provider.ts      # Tree view provider
│   │   ├── schema.ts
│   │   └── config.ts        # User configuration
│   └── starter-tasks/
│       ├── command.ts
│       ├── prompt.ts
│       ├── render.ts
│       └── schema.ts
└── test/
    └── suite/               # Integration tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "Bob Client"

# Watch mode
npm run watch
```

### Debugging

1. Set breakpoints in VS Code
2. Press `F5` to launch Extension Development Host
3. Trigger the feature you want to debug
4. Debugger will pause at breakpoints

### Adding a New Feature

1. Create feature directory: `src/features/my-feature/`
2. Implement required files:
   - `command.ts` - VS Code command handler
   - `prompt.ts` - Bob prompt template
   - `schema.ts` - Zod output schema
3. Register command in `extension.ts`
4. Add command to `package.json` contributes
5. Write tests in `test/suite/`

## Performance

### Typical Response Times

- **Repo X-Ray:** 30-60 seconds (depends on repository size)
- **Why-Is-This-Here:** 3-5 seconds (cached after first request)
- **Day-N Plan:** 10-15 seconds
- **Starter Tasks:** 15-20 seconds

### Resource Usage

- **Memory:** ~50-100 MB
- **CPU:** Minimal (most work done by Bob API)
- **Network:** ~1-5 MB per analysis

## Security

- API keys are never logged or stored in files
- All communication with Bob API is over HTTPS
- Git history is read locally, never sent to external services
- No telemetry or usage tracking

## Roadmap

### v0.1.0 (Current)
- ✅ Repo X-Ray
- ✅ Why-Is-This-Here
- ✅ Day-N Plan
- ✅ Starter Tasks

### v0.2.0 (Planned)
- [ ] Inline code annotations
- [ ] Progress tracking for Day-N Plan
- [ ] Task completion validation
- [ ] Team onboarding templates

### v0.3.0 (Future)
- [ ] Multi-repository support
- [ ] Custom learning paths
- [ ] Integration with issue trackers
- [ ] Onboarding analytics

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

## License

MIT

## Support

- **Issues:** [GitHub Issues](https://github.com/your-org/onboard/issues)
- **Documentation:** [Main README](../README.md)
- **Evaluation:** [Eval Guide](../eval/README.md)

---

**Powered by IBM Bob** | Built for IBM Bob Dev Day Hackathon 2026