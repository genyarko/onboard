# Onboard - AI-Powered Codebase Onboarding

> A VS Code extension powered by IBM Bob that transforms "first day on a new codebase" into a guided, runnable experience.

[![VS Code](https://img.shields.io/badge/VS%20Code-1.85.0+-blue.svg)](https://code.visualstudio.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![IBM Bob](https://img.shields.io/badge/IBM-Bob%20AI-blue.svg)](https://www.ibm.com/bob)

## 🎯 The Problem

New engineers take **6+ weeks** to make their first meaningful pull request. At enterprise scale, this onboarding friction costs organizations significant time and productivity. Traditional approaches rely on:
- Outdated documentation that doesn't explain *why* code exists
- Manual code reviews that interrupt senior engineers
- Trial-and-error exploration of unfamiliar patterns
- Generic learning paths that don't match the actual codebase

## 💡 The Solution

Onboard leverages IBM Bob's full-repository context and multi-source synthesis capabilities to provide:

1. **Instant Architecture Understanding** - Generate comprehensive architecture maps in seconds
2. **Historical Context on Demand** - Understand the business reasoning behind any line of code
3. **Personalized Learning Paths** - Get role-specific, 5-day onboarding plans
4. **Curated Starter Tasks** - Find beginner-friendly work to build confidence

## 🏗️ Architecture

```
onboard/
├── onboard-extension/     # VS Code extension (TypeScript)
│   ├── src/
│   │   ├── bob/          # IBM Bob API client
│   │   ├── features/     # Four core features
│   │   │   ├── repo-xray/
│   │   │   ├── why-is-this-here/
│   │   │   ├── day-n-plan/
│   │   │   └── starter-tasks/
│   │   └── prompts/      # Bob prompt templates
│   └── package.json
├── eval/                  # Evaluation harness
│   ├── faithfulness.ts   # Why-Is-This-Here accuracy
│   ├── completeness.ts   # Repo X-Ray detection rate
│   └── ground-truth/     # Hand-labeled test data
├── fastapi-demo/         # Demo repository (FastAPI)
└── README.md             # This file
```

## ✨ Features

### 1. Repo X-Ray 🔍

**Command:** `Onboard: X-Ray Repository`

Generates a comprehensive analysis of your codebase in ~30 seconds:

- **Architecture Diagram** - Mermaid visualization of system layers and dependencies
- **Critical Path Narrative** - How data flows through the application
- **Conventions Cheat Sheet** - Coding patterns and standards used
- **Weird Parts Detection** - Identifies code that contradicts conventions with explanations

**Output:** Single markdown file with embedded diagrams, opened in VS Code preview

**Why Bob?** Requires full-repository context to understand architecture holistically. Bob reads the entire repo natively, enabling accurate dependency analysis and pattern detection.

### 2. Why Is This Here? 🤔

**Command:** `Onboard: Why Is This Here?` (right-click any line)

Explains the *business reason* behind code, not just what it does:

- Synthesizes git history, linked PRs/issues, and surrounding context
- Provides paragraph-form explanation of why the code exists
- Includes references to original discussions and decisions

**Example Output:**
```
This guard was added in PR #4521 to fix a security bug where queries 
could leak across tenants when the auth middleware failed silently. 
The team chose to return empty rather than raise because the dashboard 
was crashing for free-tier users.
```

**Why Bob?** Requires multi-source synthesis across code + git + issues. Bob orchestrates this natively, while generic LLM APIs would require 3x more context-wiring code.

### 3. Day-N Plan 📅

**Command:** `Onboard: Generate 5-Day Plan`

Creates a personalized 5-day learning path based on:
- Your role (backend, frontend, full-stack, etc.)
- Seniority level (junior, mid, senior)
- Focus area (architecture, testing, deployment, etc.)

**Output:** Interactive sidebar tree view with:
- Daily reading lists (specific files, in order)
- Concepts to internalize
- Runnable tasks with validation
- Links to relevant starter tasks

### 4. Starter Tasks 🎯

**Command:** `Onboard: Find Starter Tasks`

Discovers beginner-friendly work in the repository:

- Scans for TODO/FIXME comments
- Identifies missing test coverage
- Finds undocumented functions
- Packages each as a self-contained task card

**Output:** Markdown cards with:
- Task description and context
- Hints and expected outcome
- Links to relevant files
- Validation criteria

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.x or higher
- **VS Code** 1.85.0 or higher
- **IBM Bob API** credentials

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd onboard
   ```

2. **Install extension dependencies:**
   ```bash
   cd onboard-extension
   npm install
   npm run compile
   ```

3. **Set up IBM Bob credentials:**

   **Windows (PowerShell):**
   ```powershell
   $env:BOB_API_KEY = "your-api-key-here"
   ```

   **macOS/Linux:**
   ```bash
   export BOB_API_KEY="your-api-key-here"
   ```

4. **Clone the demo repository (FastAPI):**
   ```bash
   cd ..
   git clone https://github.com/fastapi/fastapi.git fastapi-demo
   ```

5. **Launch the extension:**
   - Open `onboard-extension/` in VS Code
   - Press `F5` to launch Extension Development Host
   - Open the `fastapi-demo/` folder in the new window

### Try It Out

1. **Run Repo X-Ray:**
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Type: `Onboard: X-Ray Repository`
   - Wait ~30 seconds for analysis

2. **Explore Why-Is-This-Here:**
   - Open `fastapi/routing.py`
   - Right-click any line
   - Select `Onboard: Why Is This Here?`

3. **Generate Your Learning Plan:**
   - Open the "Day-N Plan" sidebar
   - Click the calendar icon
   - Configure your role and focus area

4. **Find Starter Tasks:**
   - Run `Onboard: Find Starter Tasks`
   - Browse the generated task cards

## 📊 Evaluation & Quality Assurance

Unlike most hackathon projects, Onboard includes a comprehensive evaluation harness to measure accuracy and completeness.

### Running Evaluations

```bash
cd eval
npm install
npm run eval
```

This runs two evaluations:

#### 1. Faithfulness Evaluation

Tests **Why-Is-This-Here** accuracy against 10 hand-labeled ground truth examples from FastAPI:

- **Accuracy Score** - Factual correctness (target: >0.7)
- **Completeness Score** - Information coverage (target: >0.7)

**Output:** `eval/out/faithfulness-results.csv`

#### 2. Completeness Evaluation

Tests **Repo X-Ray** detection rate against 5 known "weird parts" in FastAPI:

- **Detection Rate** - Percentage found (target: >0.6)
- **Match Quality** - Excellent, Good, Partial, or None

**Output:** `eval/out/completeness-results.csv`

### Ground Truth Data

All ground truth labels are manually curated from:
- Real FastAPI PRs and issues
- Verified design decisions
- Known architectural quirks

See [`eval/ground-truth/`](eval/ground-truth/) for details.

## 🛠️ Development

### Project Structure

```
onboard-extension/src/
├── extension.ts              # Entry point, command registration
├── bob/
│   └── client.ts            # Single Bob API interface
├── features/
│   ├── repo-xray/
│   │   ├── command.ts       # Command handler
│   │   ├── prompt.ts        # Bob prompt template
│   │   ├── schema.ts        # Zod output validation
│   │   └── render.ts        # Markdown generation
│   ├── why-is-this-here/
│   │   ├── command.ts
│   │   ├── prompt.ts
│   │   ├── provider.ts      # Hover provider
│   │   ├── schema.ts
│   │   └── git.ts           # Git history utilities
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
└── prompts/                 # Shared prompt utilities
```

### Design Principles

1. **Native VS Code Integration** - Use hover providers, tree views, and markdown preview instead of custom webviews
2. **Structured Outputs** - All Bob responses validated against Zod schemas
3. **Single Bob Interface** - All features call through `src/bob/client.ts`
4. **Prompt Isolation** - Prompts live in separate files, never inline
5. **Error Transparency** - User-facing error messages, no silent failures

### Adding a New Feature

1. Create feature directory: `src/features/my-feature/`
2. Implement required files:
   - `command.ts` - VS Code command handler
   - `prompt.ts` - Bob prompt template
   - `schema.ts` - Zod output schema
   - `render.ts` - UI rendering (if needed)
3. Register command in `extension.ts`
4. Add command to `package.json` contributes section

### Running Tests

```bash
cd onboard-extension
npm test
```

Tests cover:
- Bob client integration
- Feature command execution
- Schema validation
- Git utilities

## 📝 Documentation

### Getting Started
- **[Interactive Walkthrough](WALKTHROUGH.md)** - Step-by-step guide for first-time users (15-20 min)
- **[Extension README](onboard-extension/README.md)** - Detailed extension documentation
- **[Quick Start](#-quick-start)** - Installation and setup instructions

### User Guides
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Common issues and solutions with FAQ
- **[API Documentation](API.md)** - Complete API reference with inline code examples
- **[Prompt Templates](PROMPTS.md)** - Documentation of all Bob prompt templates

### Architecture & Design
- **[Architecture Decision Records](docs/adr/README.md)** - Key architectural decisions
  - [ADR-001: Use Bob for Full Repository Context](docs/adr/001-use-bob-for-full-repo-context.md)
  - [ADR-002: Four-Stage Repo X-Ray Pipeline](docs/adr/002-four-stage-repo-xray-pipeline.md)
  - [ADR-003: Structured Outputs with Zod](docs/adr/003-structured-outputs-with-zod.md)
  - [ADR-004: Native VS Code Integration](docs/adr/004-native-vscode-integration.md)
  - [ADR-005: Git History for Context](docs/adr/005-git-history-for-context.md)
  - [ADR-006: Quantitative Evaluation Harness](docs/adr/006-evaluation-harness.md)
  - [ADR-007: Prompt Isolation](docs/adr/007-prompt-isolation.md)
- **[Background](background.md)** - Project motivation and design decisions
- **[Pre-Planning](pre-planning.md)** - Build guidelines for AI agents

### Quality & Testing
- **[Evaluation Guide](eval/README.md)** - How to run and interpret evaluations
- **[Ground Truth Data](eval/ground-truth/)** - Test datasets for accuracy measurement

### Contributing
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project
- **[Development Guide](#-development)** - Setting up development environment

## 🎥 Demo

The extension is designed to demo on the FastAPI repository because:
- **Recognizable** - Judges can verify it's a real, complex codebase
- **Well-documented** - Rich git history and PR discussions
- **Interesting patterns** - Has genuine "weird parts" and design decisions
- **Right size** - Large enough to be impressive, small enough for Bob to analyze

### Demo Script (90 seconds)

1. **Open FastAPI in VS Code** (5s)
2. **Run Repo X-Ray** - Show architecture diagram and weird parts (25s)
3. **Hover on non-obvious code** - Display Why-Is-This-Here explanation (20s)
4. **Open Day-N Plan sidebar** - Show personalized 5-day plan (20s)
5. **Click a starter task** - Display task card with hints (20s)

## 🏆 Why This Wins

### Technical Excellence
- **Measured Quality** - Only hackathon project with quantitative evaluation
- **Native Integration** - Uses VS Code primitives, not custom UI
- **Structured Outputs** - All Bob responses validated, no raw text
- **Real Demo** - Works on public repos judges can verify

### IBM Bob Leverage
- **Full-Repo Context** - Repo X-Ray needs entire codebase understanding
- **Multi-Source Synthesis** - Why-Is-This-Here combines code + git + issues
- **Not Substitutable** - Explicitly demonstrates why Bob vs. generic LLM

### Practical Impact
- **Solves Real Problem** - 6+ week onboarding → days
- **Measurable Results** - Evaluation proves accuracy
- **Production-Ready** - Clean architecture, error handling, tests

## 📄 License

MIT

## 🤝 Contributing

This is a hackathon project, but contributions are welcome! Please:
1. Follow the existing architecture patterns
2. Add tests for new features
3. Update evaluation ground truth if needed
4. Keep prompts in separate files

## 📧 Contact

For questions about this project or IBM Bob integration, please open an issue.

---

**Built for IBM Bob Dev Day Hackathon 2026**