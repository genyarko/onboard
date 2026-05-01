# Onboard - AI-Powered Codebase Onboarding Assistant

A VS Code extension powered by IBM Bob that helps engineers ramp up on unfamiliar codebases quickly.

## Features

- **Repo X-Ray**: Generate architecture maps, conventions, and identify "weird parts"
- **Why-Is-This-Here**: Hover over code to understand the business context behind it
- **Day-N Plan**: Get personalized 5-day learning paths
- **Starter Tasks**: Find beginner-friendly tasks to get started

## Setup

### Prerequisites

1. Node.js 20.x or higher
2. VS Code 1.85.0 or higher
3. IBM Bob API credentials

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Bob API credentials:
   - Set environment variable `BOB_API_KEY` with your IBM Bob API key
   - Optionally set `BOB_API_ENDPOINT` (defaults to `https://api.bob.ibm.com/v1/chat`)

   **Windows (PowerShell):**
   ```powershell
   $env:BOB_API_KEY = "your-api-key-here"
   ```

   **Windows (Command Prompt):**
   ```cmd
   set BOB_API_KEY=your-api-key-here
   ```

   **macOS/Linux:**
   ```bash
   export BOB_API_KEY="your-api-key-here"
   ```

### Development

1. Compile the extension:
   ```bash
   npm run compile
   ```

2. Open this folder in VS Code

3. Press `F5` to launch the Extension Development Host

4. Test the extension in the new VS Code window

### Project Structure

```
src/
├── bob/
│   └── client.ts          # Single Bob API interface
├── prompts/               # Bob prompt templates
├── features/              # Feature implementations
│   ├── repo-xray/        # Architecture analysis
│   ├── why-is-this-here/ # Code context provider
│   ├── day-n-plan/       # Learning path generator
│   └── starter-tasks/    # Task finder
└── extension.ts           # Extension entry point
```

## Demo Repository

This extension is designed to work with the FastAPI repository for demonstration purposes:
- Location: `../fastapi-demo/`
- Clone: `git clone https://github.com/fastapi/fastapi.git`

## Development Status

### Phase 0: Foundation ✅
- [x] Extension scaffold
- [x] Bob client implementation
- [x] FastAPI demo repo cloned
- [x] Project structure created

### Phase 1: Repo X-Ray (In Progress)
- [ ] Entry points detection
- [ ] Dependency graph analysis
- [ ] Architecture diagram generation
- [ ] Weird parts detection

### Phase 2: Why-Is-This-Here
- [ ] Hover provider
- [ ] Git history integration
- [ ] PR/issue linking

### Phase 3: Eval Harness
- [ ] Faithfulness evaluation
- [ ] Completeness evaluation

### Phase 4: Day-N Plan
- [ ] Configuration UI
- [ ] Plan generation
- [ ] Tree view provider

### Phase 5: Starter Tasks
- [ ] Task finder
- [ ] Task card renderer

### Phase 6: Polish & Demo
- [ ] Demo video
- [ ] Documentation
- [ ] Submission deck

## Commands

- `Onboard: X-Ray Repository` - Analyze repository architecture

## License

MIT
