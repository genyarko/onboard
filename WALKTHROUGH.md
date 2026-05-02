# Onboard Extension - Interactive Walkthrough

> A step-by-step guide to using the Onboard VS Code extension for the first time

## 🎯 What You'll Learn

By the end of this walkthrough, you'll know how to:

1. ✅ Set up the Onboard extension
2. ✅ Generate a comprehensive repository analysis (Repo X-Ray)
3. ✅ Understand the business context behind any line of code (Why Is This Here)
4. ✅ Create a personalized 5-day onboarding plan (Day-N Plan)
5. ✅ Find beginner-friendly tasks to get started (Starter Tasks)

**Time Required:** 15-20 minutes

**Prerequisites:**
- VS Code 1.85.0 or higher
- Node.js 20.x or higher
- IBM Bob API key
- Git installed

---

## Part 1: Setup (5 minutes)

### Step 1: Install Dependencies

Open a terminal and navigate to the extension directory:

```bash
cd onboard-extension
npm install
npm run compile
```

**Expected Output:**
```
✓ Dependencies installed
✓ TypeScript compiled successfully
```

### Step 2: Configure IBM Bob API Key

**Windows (PowerShell):**
```powershell
$env:BOB_API_KEY = "your-api-key-here"
```

**macOS/Linux:**
```bash
export BOB_API_KEY="your-api-key-here"
```

**Verify it's set:**
```bash
# Windows
echo $env:BOB_API_KEY

# macOS/Linux
echo $BOB_API_KEY
```

### Step 3: Launch the Extension

1. Open the `onboard-extension/` folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. A new VS Code window will open with the extension loaded

**Success Indicator:** You'll see "Extension Development Host" in the window title

### Step 4: Open the Demo Repository

In the Extension Development Host window:

1. File → Open Folder
2. Navigate to `fastapi-demo/`
3. Click "Select Folder"

**Success Indicator:** You'll see the FastAPI file tree in the Explorer

---

## Part 2: Repo X-Ray - Understanding the Architecture (5 minutes)

### What is Repo X-Ray?

Repo X-Ray analyzes your entire codebase and generates:
- Architecture diagram showing system layers
- Critical path narrative explaining request flow
- Conventions cheat sheet documenting patterns
- "Weird parts" detection highlighting unusual code

### Step 1: Run Repo X-Ray

1. Open Command Palette: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. Type: `Onboard: X-Ray Repository`
3. Press Enter

**What's Happening:**
```
[1/4] Identifying entry points...
[2/4] Analyzing dependencies...
[3/4] Generating artifacts...
[4/4] Detecting weird parts...
```

**Time:** ~30-45 seconds

### Step 2: Explore the Results

The analysis opens in a new markdown preview. Let's explore each section:

#### 🏗️ Architecture Diagram

**What to Look For:**
- Main layers (routes, services, models, utilities)
- Dependencies between layers
- Entry points highlighted

**Try This:**
- Hover over diagram nodes to see details
- Notice how data flows from routes → services → models

#### 📖 Critical Path Narrative

**What to Look For:**
- How a typical request flows through the system
- Key initialization steps
- Important middleware and dependencies

**Try This:**
- Read the 3-5 paragraph narrative
- Identify the main entry point (usually `main.py` or `app.py`)
- Trace a request from HTTP endpoint to database

#### 📋 Conventions Cheat Sheet

**What to Look For:**
- Naming conventions (e.g., `get_*` for retrieval functions)
- File structure patterns (e.g., `routers/` for endpoints)
- Error handling patterns
- Testing conventions

**Try This:**
- Note the naming pattern for route handlers
- Check how errors are handled
- Look for dependency injection patterns

#### 🤔 Weird Parts

**What to Look For:**
- Vendored/copied code from other libraries
- Workarounds and hacks
- Deprecated APIs still in use
- Non-obvious behaviors

**Example Finding:**
```
📍 fastapi/routing.py:156-162
Description: Manual dependency resolution instead of using built-in DI
Reason: Workaround for circular dependency issue in early versions
Impact: Adds complexity but necessary for backward compatibility
```

**Try This:**
- Click file paths to jump to the code
- Read the explanations for why weird code exists
- Note which findings are marked "high severity"

### Step 3: Save for Reference

1. Click the "..." menu in the preview
2. Select "Save As..."
3. Save as `ARCHITECTURE.md` in your project root

**Pro Tip:** Share this with your team as onboarding documentation!

---

## Part 3: Why Is This Here - Understanding Code Context (3 minutes)

### What is Why Is This Here?

This feature explains the **business reason** behind code by analyzing:
- Git history (who changed it and when)
- Linked pull requests and issues
- Commit messages and discussions
- Surrounding code context

### Step 1: Find Interesting Code

Let's explore a non-obvious piece of code:

1. Open `fastapi/routing.py`
2. Scroll to line ~156 (or search for "dependency")
3. You'll see some manual dependency resolution code

### Step 2: Ask "Why Is This Here?"

**Method 1: Right-Click Menu**
1. Right-click on line 156
2. Select "Onboard: Why Is This Here?"

**Method 2: Hover (if enabled)**
1. Hover over line 156
2. Wait 1-2 seconds
3. A popup appears with the explanation

**What's Happening:**
```
Analyzing git history...
Fetching linked PRs...
Synthesizing context...
```

**Time:** ~5-10 seconds

### Step 3: Read the Explanation

You'll see a structured explanation:

#### Summary
```
Manual dependency resolution to handle circular dependencies
```

#### Business Reason
```
This workaround was added in PR #4521 to fix a critical bug where
circular dependencies caused application crashes during startup.
The team chose manual resolution over refactoring because it
maintained backward compatibility with existing plugins.
```

#### Technical Context
```
The code manually resolves dependencies by:
1. Collecting all route dependencies
2. Building a dependency graph
3. Resolving in topological order

This bypasses FastAPI's built-in DI system for this specific case.
```

#### Related Changes
```
- PR #4521: Fix circular dependency crash
- Issue #4500: Application fails to start with custom plugins
- Commit abc123: Add manual dependency resolution
```

#### Confidence: High
```
Based on 3 commits, 1 PR, and 2 linked issues
```

### Step 4: Try More Examples

**Good Lines to Explore:**
- `fastapi/applications.py:89` - Unusual initialization order
- `fastapi/params.py:234` - Deprecated parameter handling
- `fastapi/dependencies/utils.py:156` - Complex caching logic

**Pro Tip:** Use this feature when you encounter confusing code during code review!

---

## Part 4: Day-N Plan - Your Personalized Learning Path (4 minutes)

### What is Day-N Plan?

Day-N Plan creates a customized 5-day onboarding plan based on:
- Your role (backend, frontend, full-stack, etc.)
- Your seniority level (junior, mid, senior)
- Your focus area (architecture, testing, deployment, etc.)

### Step 1: Open the Day-N Plan Sidebar

1. View → Open View → "Day-N Plan"
2. Or click the calendar icon in the Activity Bar

**Success Indicator:** You'll see an empty tree view with a "Generate Plan" button

### Step 2: Configure Your Profile

Click the "Generate Plan" button. You'll be prompted for:

**1. Select Your Role:**
```
○ Backend Engineer
○ Frontend Engineer
○ Full-Stack Engineer
○ DevOps Engineer
○ QA Engineer
○ Mobile Engineer
```

**Choose:** Backend Engineer (for this walkthrough)

**2. Select Your Seniority:**
```
○ Junior (0-2 years)
○ Mid-Level (2-5 years)
○ Senior (5+ years)
○ Staff+ (8+ years)
```

**Choose:** Mid-Level (for this walkthrough)

**3. Select Your Focus Area:**
```
○ Architecture & Design
○ API Development
○ Testing & Quality
○ Performance Optimization
○ Security
○ Deployment & DevOps
```

**Choose:** API Development (for this walkthrough)

**What's Happening:**
```
Analyzing repository structure...
Identifying key files for backend/API focus...
Generating personalized 5-day plan...
```

**Time:** ~20-30 seconds

### Step 3: Explore Your Plan

The sidebar now shows a 5-day tree structure:

#### 📅 Day 1: Orientation & Overview
```
├─ 📖 Reading List (2-3 hours)
│  ├─ README.md - Project overview
│  ├─ fastapi/applications.py - Main application setup
│  └─ docs/tutorial/first-steps.md - Getting started
├─ 🎯 Key Concept: FastAPI application structure
├─ ✏️ Task: Fix a typo in documentation (1-2 hours)
│  └─ Hints: Check docs/ folder, look for spelling errors
└─ 💡 Tips
   └─ Focus on understanding the big picture today
```

**Try This:**
- Click on `README.md` to open it
- Read through the overview
- Note the estimated time (2-3 hours)

#### 📅 Day 2: Deep Dive - Core Domain
```
├─ 📖 Reading List (3-4 hours)
│  ├─ fastapi/routing.py - Request routing
│  ├─ fastapi/dependencies/ - Dependency injection
│  └─ fastapi/params.py - Parameter handling
├─ 🎯 Key Concept: Request lifecycle and DI
├─ ✏️ Task: Trace a request through the system (2-3 hours)
│  └─ Start: fastapi/applications.py:89
│  └─ Follow: Route → Dependency → Handler → Response
└─ 💡 Tips
   └─ Use debugger to step through request handling
```

**Try This:**
- Open `fastapi/routing.py`
- Use "Why Is This Here?" on interesting lines
- Follow the suggested trace path

#### 📅 Day 3: API Development Focus
```
├─ 📖 Reading List (2-3 hours)
│  ├─ fastapi/openapi/ - OpenAPI schema generation
│  ├─ fastapi/encoders.py - Response encoding
│  └─ tests/test_tutorial/ - API testing patterns
├─ 🎯 Key Concept: API design and documentation
├─ ✏️ Task: Add a new endpoint with tests (3-4 hours)
│  └─ File: fastapi/routing.py
│  └─ Add: GET /health endpoint
│  └─ Test: tests/test_health.py
└─ 💡 Tips
   └─ Follow existing endpoint patterns
   └─ Include OpenAPI documentation
```

#### 📅 Day 4: Integration & Patterns
```
├─ 📖 Reading List (2-3 hours)
│  ├─ fastapi/middleware/ - Middleware patterns
│  ├─ fastapi/security/ - Authentication
│  └─ fastapi/background.py - Background tasks
├─ 🎯 Key Concept: Cross-cutting concerns
├─ ✏️ Task: Refactor code to follow conventions (3-4 hours)
└─ 💡 Tips
   └─ Review conventions from Repo X-Ray
```

#### 📅 Day 5: Real Contribution
```
├─ 📖 Reading List (1-2 hours)
│  └─ Related to your first real task
├─ 🎯 Key Concept: Making meaningful contributions
├─ ✏️ Task: Implement a feature or fix a real bug (4-6 hours)
│  └─ See Starter Tasks for suggestions
└─ 💡 Tips
   └─ Ask for code review from team
   └─ Write comprehensive tests
```

### Step 4: Track Your Progress

As you complete each day:

1. Right-click on the day
2. Select "Mark as Complete"
3. The checkmark updates: ☐ → ☑

**Pro Tip:** Export your plan as markdown for offline reference!

---

## Part 5: Starter Tasks - Finding Your First Contribution (3 minutes)

### What are Starter Tasks?

Starter Tasks scans your repository for beginner-friendly work:
- TODO/FIXME comments
- Missing test coverage
- Undocumented functions
- Simple bug fixes

Each task includes:
- Clear description
- Helpful hints
- Expected outcome
- Validation criteria

### Step 1: Find Starter Tasks

1. Open Command Palette: `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type: `Onboard: Find Starter Tasks`
3. Press Enter

**What's Happening:**
```
Scanning for TODO/FIXME comments...
Analyzing test coverage...
Checking documentation...
Generating task cards...
```

**Time:** ~15-20 seconds

### Step 2: Browse Task Cards

The results open as a markdown document with task cards:

#### 🎯 Task 1: Add Email Validation

**Difficulty:** Easy | **Time:** 15-20 minutes

**Description:**
Add input validation for the email field in the user creation endpoint.

**Location:**
- File: `fastapi/users.py`
- Line: 42
- Function: `create_user()`

**Context:**
Currently, the endpoint accepts any string as an email without validation.
This could lead to invalid data in the database.

**Hints:**
1. Use Pydantic's `EmailStr` type for automatic validation
2. Add a test case in `tests/test_users.py`
3. Check existing validation patterns in `fastapi/params.py`

**Expected Outcome:**
- Invalid emails are rejected with a 422 error
- Valid emails are accepted
- Test coverage for both cases

**Validation:**
```bash
# Run tests
pytest tests/test_users.py::test_email_validation

# Try invalid email
curl -X POST http://localhost:8000/users \
  -H "Content-Type: application/json" \
  -d '{"email": "not-an-email"}'

# Should return 422 Unprocessable Entity
```

**Why This is a Good Starter Task:**
- Low stakes (validation logic)
- Clear requirements
- Teaches Pydantic patterns
- Includes testing practice

---

#### 🎯 Task 2: Document the Cache Utility

**Difficulty:** Easy | **Time:** 20-30 minutes

**Description:**
Add docstrings to the caching utility functions in `fastapi/utils/cache.py`.

**Location:**
- File: `fastapi/utils/cache.py`
- Lines: 15-89
- Functions: `cache_get()`, `cache_set()`, `cache_invalidate()`

**Context:**
The caching utilities are used throughout the codebase but lack documentation.
New developers struggle to understand the caching strategy.

**Hints:**
1. Follow Google-style docstring format (see existing examples)
2. Include parameter descriptions and return types
3. Add usage examples
4. Document the cache key format

**Expected Outcome:**
- All public functions have docstrings
- Parameters and return values documented
- At least one usage example per function

**Validation:**
```bash
# Generate documentation
python -m pydoc fastapi.utils.cache

# Should show complete documentation
```

**Why This is a Good Starter Task:**
- Requires reading and understanding code
- Low risk of breaking anything
- Improves codebase quality
- Good introduction to the caching system

---

#### 🎯 Task 3: Fix Deprecation Warning

**Difficulty:** Medium | **Time:** 30-45 minutes

**Description:**
Replace deprecated `json_encoder` parameter with the new `model_serializer`.

**Location:**
- File: `fastapi/responses.py`
- Line: 67
- Function: `JSONResponse.__init__()`

**Context:**
Pydantic v2 deprecated `json_encoder` in favor of `model_serializer`.
The codebase still uses the old parameter, causing warnings.

**Hints:**
1. Check Pydantic v2 migration guide
2. Look for similar migrations in `fastapi/encoders.py`
3. Update tests to verify behavior unchanged
4. Run full test suite to catch regressions

**Expected Outcome:**
- No deprecation warnings
- All tests pass
- Behavior unchanged (backward compatible)

**Validation:**
```bash
# Run tests with warnings enabled
pytest -W error::DeprecationWarning tests/

# Should pass without warnings
```

**Why This is a Good Starter Task:**
- Teaches migration patterns
- Requires understanding of serialization
- Moderate complexity
- Real impact on codebase health

---

### Step 3: Pick Your First Task

**For This Walkthrough:** Let's do Task 1 (Email Validation)

1. Click the file path: `fastapi/users.py:42`
2. VS Code opens the file at line 42
3. Read the TODO comment
4. Follow the hints to implement the fix

**Pro Tip:** Start with "Easy" tasks to build confidence!

---

## 🎓 What You've Learned

Congratulations! You've completed the Onboard walkthrough. You now know how to:

✅ **Repo X-Ray**: Generate comprehensive architecture documentation
- Understand system layers and dependencies
- Identify entry points and critical paths
- Learn coding conventions
- Spot unusual code patterns

✅ **Why Is This Here**: Understand code context
- Discover business reasoning behind code
- Trace git history and linked PRs
- Learn from past decisions
- Avoid repeating mistakes

✅ **Day-N Plan**: Create personalized learning paths
- Get role-specific guidance
- Follow structured 5-day plans
- Track your progress
- Build confidence systematically

✅ **Starter Tasks**: Find beginner-friendly work
- Discover low-risk contributions
- Get helpful hints and guidance
- Validate your work
- Make meaningful contributions

---

## 🚀 Next Steps

### 1. Use on Your Own Repository

Try Onboard on your team's codebase:

```bash
# Open your repository
cd /path/to/your/repo

# Launch VS Code with Onboard
code .

# Run Repo X-Ray
Ctrl+Shift+P → "Onboard: X-Ray Repository"
```

### 2. Customize Your Experience

**Adjust Settings:**
- Enable/disable hover provider
- Configure cache duration
- Set default role/seniority

**Create Custom Templates:**
- Edit prompt templates in `src/features/*/prompt.ts`
- Add custom task categories
- Customize Day-N Plan structure

### 3. Share with Your Team

**Export Documentation:**
- Save Repo X-Ray results as `ARCHITECTURE.md`
- Share Day-N Plans with new hires
- Create a team starter tasks list

**Integrate with Onboarding:**
- Add Onboard to your onboarding checklist
- Create team-specific learning paths
- Track new hire progress

### 4. Contribute Back

**Report Issues:**
- Found a bug? Open an issue on GitHub
- Inaccurate explanation? Provide feedback
- Missing feature? Submit a feature request

**Improve Prompts:**
- Edit prompt templates for better results
- Share your improvements with the community
- Contribute to evaluation ground truth

### 5. Advanced Usage

**Evaluation Harness:**
```bash
cd eval
npm install
npm run eval
```

**Custom Features:**
- Create new features following the pattern
- Add custom prompt templates
- Extend the Bob client

---

## 📚 Additional Resources

### Documentation
- [README.md](README.md) - Project overview
- [API.md](API.md) - API reference
- [PROMPTS.md](PROMPTS.md) - Prompt templates
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues

### Architecture Decision Records
- [ADR-001: Use Bob for Full Repo Context](docs/adr/001-use-bob-for-full-repo-context.md)
- [ADR-002: Four-Stage Repo X-Ray Pipeline](docs/adr/002-four-stage-repo-xray-pipeline.md)
- [ADR-003: Structured Outputs with Zod](docs/adr/003-structured-outputs-with-zod.md)
- [ADR-004: Native VS Code Integration](docs/adr/004-native-vscode-integration.md)

### Evaluation
- [Evaluation Guide](eval/README.md) - How to run evaluations
- [Ground Truth Data](eval/ground-truth/) - Test datasets

### Community
- GitHub Issues: Report bugs and request features
- Discussions: Ask questions and share tips
- Contributing: See [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 💡 Pro Tips

### Keyboard Shortcuts

**Windows/Linux:**
- `Ctrl+Shift+P` - Command Palette
- `Ctrl+P` - Quick Open File
- `Ctrl+G` - Go to Line
- `F12` - Go to Definition

**macOS:**
- `Cmd+Shift+P` - Command Palette
- `Cmd+P` - Quick Open File
- `Cmd+G` - Go to Line
- `F12` - Go to Definition

### Workflow Tips

1. **Start with Repo X-Ray**: Get the big picture first
2. **Use Why Is This Here liberally**: Don't guess, ask!
3. **Follow Your Day-N Plan**: Structured learning is more effective
4. **Pick Easy Starter Tasks first**: Build confidence before tackling complex issues
5. **Save Documentation**: Export and share with your team

### Performance Tips

1. **Use .bobignore**: Exclude large directories (node_modules, dist, etc.)
2. **Cache Results**: Why Is This Here caches explanations
3. **Run in Background**: Use background mode for long-running commands
4. **Limit Scope**: Focus on specific directories when possible

### Quality Tips

1. **Verify Explanations**: Cross-check with git history
2. **Provide Feedback**: Report inaccuracies to improve prompts
3. **Update Ground Truth**: Contribute to evaluation datasets
4. **Share Findings**: Help improve the tool for everyone

---

## ❓ FAQ

**Q: How long does Repo X-Ray take?**
A: Typically 30-45 seconds for medium-sized repositories (<10,000 files).

**Q: Can I use Onboard without git history?**
A: Yes, but Why Is This Here will have lower confidence. Other features work normally.

**Q: Does Onboard work with private repositories?**
A: Yes! Your code never leaves your machine except for Bob API calls (encrypted).

**Q: Can I customize the prompts?**
A: Yes! Edit files in `src/features/*/prompt.ts`. See [PROMPTS.md](PROMPTS.md) for details.

**Q: How accurate is Why Is This Here?**
A: >70% accuracy on well-documented repositories. See [eval/README.md](eval/README.md) for metrics.

**Q: Can I use Onboard on monorepos?**
A: Yes, but use `.bobignore` to exclude irrelevant directories for better performance.

**Q: Does Onboard support languages other than TypeScript?**
A: Yes! Works with any language. The demo uses Python (FastAPI).

**Q: How much does Bob API cost?**
A: Contact IBM for pricing. Onboard minimizes API calls through caching.

---

## 🎉 Congratulations!

You've completed the Onboard walkthrough! You're now ready to:

- Onboard to new codebases in days instead of weeks
- Understand code context without interrupting senior engineers
- Follow structured learning paths tailored to your role
- Make meaningful contributions from day one

**Happy coding!** 🚀

---

**Need Help?**
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Open an issue on GitHub
- Join our community discussions

**Last Updated:** 2026-05-02
**Version:** 1.0.0
