# Onboard VS Code Extension - Implementation Plan

## Overview
48-hour hackathon build for IBM Bob Dev Day. Solo developer + AI agents.
**Goal:** Win the hackathon with a polished, measurable VS Code extension.

---

## Phase 0: Foundation (2 hours)

### Tasks
1. **Set up development environment**
   - [ ] Install Node.js, npm, VS Code Extension Generator (`npm install -g yo generator-code`)
   - [ ] Verify IBM Bob account and API access
   - [ ] Test Bob API connectivity with a simple query

2. **Scaffold VS Code extension**
   - [ ] Run `yo code` to generate TypeScript extension scaffold
   - [ ] Name: `onboard`
   - [ ] Configure `package.json` with extension metadata
   - [ ] Set up TypeScript strict mode in `tsconfig.json`

3. **Clone demo repository**
   - [ ] Clone FastAPI: `git clone https://github.com/fastapi/fastapi.git`
   - [ ] Place in a known location for testing
   - [ ] Verify git history is intact for Why-Is-This-Here feature

4. **Create Bob client module**
   - [ ] Create `src/bob/client.ts`
   - [ ] Implement single `ask(prompt: string, context?: any): Promise<any>` function
   - [ ] Add error handling and retry logic
   - [ ] Test with a simple "hello world" query

5. **Set up project structure**
   ```
   src/
   ├── bob/
   │   └── client.ts
   ├── prompts/
   │   └── (prompts will go here)
   ├── features/
   │   └── (features will go here)
   └── extension.ts
   ```

### Success Criteria
- Extension loads in VS Code debug mode
- Bob client can make successful API calls
- FastAPI repo is cloned and accessible
- Project structure is clean and organized

---

## Phase 1: Repo X-Ray (6 hours)

### Architecture
Feature folder: `src/features/repo-xray/`
- `command.ts` - VS Code command handler
- `prompt.ts` - Bob prompt templates (4 sequential prompts)
- `schema.ts` - Zod schemas for structured outputs
- `render.ts` - Markdown + Mermaid rendering

### Tasks

#### 1.1 Define schemas (30 min)
- [ ] Create `schema.ts` with Zod schemas for:
  - Entry points response
  - Dependency graph response
  - Artifacts response (architecture, conventions, narrative)
  - Weird parts response

#### 1.2 Build prompt pipeline (2 hours)
- [ ] **Prompt 1: Entry Points**
  - Identify main entry points, app initialization, route definitions
  - Return structured list of files and their roles

- [ ] **Prompt 2: Dependency Walk**
  - Walk dependency graph from each entry point
  - Identify architectural layers (routes → services → models → utils)
  - Return layer mapping

- [ ] **Prompt 3: Generate Artifacts**
  - Architecture diagram (Mermaid syntax)
  - Critical-path narrative (markdown)
  - Conventions cheat sheet (markdown)

- [ ] **Prompt 4: Weird Parts Analysis**
  - Find code that contradicts identified conventions
  - Flag with hypotheses about why it exists
  - Return list of weird parts with explanations

#### 1.3 Implement command handler (1.5 hours)
- [ ] Register command `onboard.xrayRepo` in `package.json`
- [ ] Implement `command.ts`:
  - Get workspace root path
  - Read relevant files for context
  - Execute 4 prompts sequentially
  - Validate responses against schemas
  - Handle errors gracefully

#### 1.4 Build markdown renderer (1.5 hours)
- [ ] Implement `render.ts`:
  - Combine all outputs into single markdown document
  - Embed Mermaid diagrams
  - Format conventions as tables
  - Highlight weird parts in callout boxes
  - Save to workspace as `ONBOARD_XRAY.md`
  - Open in VS Code preview pane

#### 1.5 Test and refine (30 min)
- [ ] Run on FastAPI repository
- [ ] Verify output quality
- [ ] Adjust prompts if needed
- [ ] Ensure markdown renders correctly

### Success Criteria
- Command runs without errors on FastAPI
- Output markdown contains all 4 sections
- Mermaid diagrams render in VS Code preview
- Weird parts are identified and explained
- Execution time < 60 seconds

---

## Phase 2: Why-Is-This-Here (5 hours)

### Architecture
Feature folder: `src/features/why-is-this-here/`
- `provider.ts` - VS Code hover provider
- `prompt.ts` - Bob prompt template
- `schema.ts` - Zod schema for explanation
- `git.ts` - Git history utilities

### Tasks

#### 2.1 Build git utilities (1.5 hours)
- [ ] Create `git.ts` with functions:
  - `getLineHistory(file: string, line: number): Promise<GitLog[]>`
    - Use `git log -L <line>,<line>:<file>` to get line-specific history
  - `getCommitDetails(hash: string): Promise<CommitDetails>`
    - Get commit message, author, date
  - `getLinkedPRs(hash: string): Promise<PR[]>`
    - Parse commit message for PR references (#1234)
    - Fetch PR details from GitHub API (if available)

#### 2.2 Define schema and prompt (1 hour)
- [ ] Create `schema.ts`:
  - Explanation schema with fields: summary, businessReason, technicalContext, relatedChanges
- [ ] Create `prompt.ts`:
  - Template that takes: line content, surrounding context (±30 lines), git history, PR/issue text
  - Instructs Bob to synthesize WHY (business reason), not just WHAT (code description)
  - Emphasizes connecting code to historical decisions

#### 2.3 Implement hover provider (2 hours)
- [ ] Create `provider.ts`:
  - Implement `vscode.HoverProvider` interface
  - On hover:
    1. Get current line and ±30 lines context
    2. Fetch git history for that line range
    3. Fetch linked PR/issue details
    4. Build context object
    5. Call Bob with prompt
    6. Validate response
    7. Format as hover markdown
  - Handle errors (no git history, API failures, etc.)

#### 2.4 Register and test (30 min)
- [ ] Register hover provider in `extension.ts`
- [ ] Test on FastAPI files with known history
- [ ] Verify explanations are accurate and insightful
- [ ] Adjust prompt if needed

### Success Criteria
- Hover works on any line in FastAPI repo
- Explanations include business context from PRs/issues
- Response time < 5 seconds per hover
- Graceful degradation when git history unavailable
- Markdown formatting is clean and readable

---

## Phase 3: Eval Harness (3 hours)

### Architecture
```
eval/
├── faithfulness.ts
├── completeness.ts
├── ground-truth/
│   ├── faithfulness-labels.json
│   └── completeness-labels.json
└── out/
    ├── faithfulness.csv
    └── completeness.csv
```

### Tasks

#### 3.1 Create ground truth data (1.5 hours)
- [ ] **Faithfulness labels** (10 examples):
  - Pick 10 interesting lines from FastAPI
  - Research actual PRs/issues that explain them
  - Write verified explanations
  - Save to `ground-truth/faithfulness-labels.json`

- [ ] **Completeness labels** (5 examples):
  - Identify 5 "weird parts" in FastAPI:
    - Legacy decisions
    - Non-obvious conventions
    - Workarounds for bugs
  - Document why they're weird
  - Save to `ground-truth/completeness-labels.json`

#### 3.2 Build faithfulness eval (45 min)
- [ ] Create `faithfulness.ts`:
  - Load ground truth labels
  - For each labeled line:
    1. Run Why-Is-This-Here
    2. Compare Bob's output to ground truth
    3. Score: factual accuracy (0-1), completeness (0-1)
  - Output CSV with columns: file, line, ground_truth, bob_output, accuracy_score, completeness_score
  - Calculate average scores

#### 3.3 Build completeness eval (45 min)
- [ ] Create `completeness.ts`:
  - Load ground truth weird parts
  - Run Repo X-Ray on FastAPI
  - Check if each labeled weird part appears in output
  - Score: found (1) or not found (0)
  - Output CSV with columns: weird_part, description, found, bob_explanation
  - Calculate detection rate

#### 3.4 Add npm script and test (15 min)
- [ ] Add `"eval": "ts-node eval/faithfulness.ts && ts-node eval/completeness.ts"` to package.json
- [ ] Run `npm run eval`
- [ ] Verify CSVs are generated
- [ ] Review scores and adjust prompts if needed

### Success Criteria
- Both eval scripts run without errors
- CSVs are generated in `eval/out/`
- Faithfulness accuracy > 70%
- Completeness detection rate > 60%
- Results are reproducible

---

## Phase 4: Day-N Plan (4 hours)

### Architecture
Feature folder: `src/features/day-n-plan/`
- `command.ts` - Command to generate plan
- `provider.ts` - Tree view provider
- `prompt.ts` - Bob prompt template
- `schema.ts` - Zod schema for plan structure
- `config.ts` - User configuration form

### Tasks

#### 4.1 Define schema and prompt (1 hour)
- [ ] Create `schema.ts`:
  - Plan schema: 5 days, each with reading list, concept, task
  - Reading item: file path, description, estimated time
  - Task: title, description, link to starter task or file
- [ ] Create `prompt.ts`:
  - Takes: role, seniority, focus area, repo structure
  - Returns: personalized 5-day plan as structured JSON
  - Emphasizes progression: Day 1 = overview, Day 5 = real contribution

#### 4.2 Build configuration UI (1 hour)
- [ ] Create `config.ts`:
  - Use `vscode.window.showQuickPick` for role selection
  - Use `vscode.window.showQuickPick` for seniority
  - Use `vscode.window.showInputBox` for focus area
  - Return configuration object

#### 4.3 Implement tree view provider (1.5 hours)
- [ ] Create `provider.ts`:
  - Implement `vscode.TreeDataProvider` interface
  - Tree structure: Day → Items (readings, concept, task)
  - Each item is clickable:
    - Reading → opens file
    - Task → opens task card or file
  - Add refresh command

#### 4.4 Implement command and test (30 min)
- [ ] Create `command.ts`:
  - Show configuration UI
  - Call Bob with prompt
  - Validate response
  - Update tree view
- [ ] Register command and tree view in `extension.ts`
- [ ] Test on FastAPI with different configurations

### Success Criteria
- Configuration UI is intuitive
- Plan is generated in < 30 seconds
- Tree view displays all 5 days with items
- Clicking items navigates correctly
- Plan is personalized based on configuration

---

## Phase 5: Starter Tasks (5 hours)

### Architecture
Feature folder: `src/features/starter-tasks/`
- `command.ts` - Command to find tasks
- `prompt.ts` - Bob prompt template
- `schema.ts` - Zod schema for task structure
- `render.ts` - Task card markdown renderer

### Tasks

#### 5.1 Define schema and prompt (1 hour)
- [ ] Create `schema.ts`:
  - Task schema: title, description, file, line, hints, expected_outcome, difficulty
- [ ] Create `prompt.ts`:
  - Scans for TODO/FIXME comments
  - Filters for low-stakes tasks (no breaking changes)
  - Returns top 3 tasks with context

#### 5.2 Implement task finder (2 hours)
- [ ] Create `command.ts`:
  - Scan workspace for TODO/FIXME comments
  - Send to Bob for filtering and packaging
  - Validate response
  - Generate task cards

#### 5.3 Build task card renderer (1.5 hours)
- [ ] Create `render.ts`:
  - Format task as markdown card:
    - Title and difficulty badge
    - Description
    - File location (clickable link)
    - Hints (collapsible)
    - Expected outcome
    - Checkbox for completion
  - Save to `ONBOARD_TASKS/task-{n}.md`
  - Open in editor

#### 5.4 Test and refine (30 min)
- [ ] Run on FastAPI
- [ ] Verify tasks are appropriate for beginners
- [ ] Check markdown formatting
- [ ] Adjust prompt if needed

### Success Criteria
- Command finds at least 3 tasks in FastAPI
- Tasks are genuinely low-stakes
- Task cards are well-formatted and helpful
- File links work correctly
- Execution time < 45 seconds

---

## Phase 6: Polish & Demo Prep (4 hours)

### Tasks

#### 6.1 Pre-record demo video (1.5 hours)
- [ ] Write demo script (90 seconds):
  1. Open FastAPI in VS Code (5s)
  2. Run Repo X-Ray, show output (20s)
  3. Hover on a line, show explanation (15s)
  4. Open Day-N Plan sidebar (15s)
  5. Open a starter task (15s)
  6. Closing statement (20s)
- [ ] Record in 1080p with clear audio
- [ ] Edit for timing and clarity
- [ ] Export 90s, 60s, and 30s versions

#### 6.2 Write README (1 hour)
- [ ] Structure as product page:
  - Hero: "Onboard - Turn Day 1 into Day 30"
  - Problem statement with citation
  - Features with screenshots
  - Installation instructions
  - Demo video embed
  - Technical architecture
  - Eval results
- [ ] Add badges (TypeScript, VS Code, IBM Bob)
- [ ] Include GIFs of each feature

#### 6.3 Create submission deck (1 hour)
- [ ] **Slide 1: Problem**
  - "New engineers take 6+ weeks to first meaningful PR"
  - Cost calculation for enterprise
  - Citation: Stripe Developer Coefficient Report
- [ ] **Slide 2: Demo**
  - Embed 90-second video
  - Key features callout
- [ ] **Slide 3: Why Bob**
  - Full-repo context for X-Ray
  - Multi-source synthesis for Why-Is-This-Here
  - Comparison: "With generic LLM API, context wiring = 3x longer"
  - Eval results (faithfulness & completeness scores)

#### 6.4 Final polish (30 min)
- [ ] Remove all console.log statements
- [ ] Remove commented-out code
- [ ] Run TypeScript compiler with strict mode
- [ ] Fix any linting errors
- [ ] Test all features end-to-end
- [ ] Create architecture diagram for deck

### Success Criteria
- Demo video is polished and under 90 seconds
- README reads like a product page
- Deck is 3 slides, visually clean
- No dead code or console.logs
- All features work end-to-end

---

## Phase 7: Buffer (3 hours)

### Purpose
Handle unexpected issues:
- API rate limits or failures
- Prompt tuning iterations
- Extension packaging issues
- Demo environment setup
- Last-minute bug fixes

### Tasks
- [ ] Test extension on fresh VS Code install
- [ ] Verify all dependencies are in package.json
- [ ] Test on Windows/Mac/Linux (if possible)
- [ ] Create backup demo video
- [ ] Prepare offline demo fallback

---

## Cutoff Strategy

If behind schedule at any point:

### After Phase 2 (11 hours in)
- **If on track:** Continue to Phase 3
- **If behind:** Skip to Phase 3 (eval), then Phase 6 (polish)
- **Rationale:** 2 features + eval + polish beats 4 half-broken features

### After Phase 3 (14 hours in)
- **If on track:** Continue to Phase 4
- **If behind:** Skip Phase 4 and 5, go straight to Phase 6
- **Rationale:** Repo X-Ray + Why-Is-This-Here + eval is a strong submission

### After Phase 5 (24 hours in)
- **Must proceed to Phase 6:** Polish and demo prep are non-negotiable
- **Use remaining buffer for final testing**

---

## Daily Checkpoints

### End of Day 1 (24 hours in)
- [ ] Phases 0-3 complete
- [ ] Repo X-Ray working
- [ ] Why-Is-This-Here working
- [ ] Eval harness producing CSVs

### End of Day 2 (48 hours in)
- [ ] All phases complete (or cutoff strategy executed)
- [ ] Demo video recorded
- [ ] README polished
- [ ] Deck finalized
- [ ] Submission ready

---

## Success Metrics

### Minimum Viable Submission (16/20 score)
- ✅ Repo X-Ray working cleanly
- ✅ Why-Is-This-Here working cleanly
- ✅ Eval harness with CSVs
- ✅ Pre-recorded demo
- ✅ Clean README

### Winning Submission (19/20 score)
- ✅ All 4 features working
- ✅ Eval scores > 70% faithfulness, > 60% completeness
- ✅ Native VS Code integration (no custom webviews)
- ✅ Polished demo video
- ✅ Strong "Why Bob" narrative in deck
- ✅ Zero dead code, clean architecture

---

## Notes

- **One feature at a time:** Don't start Phase N+1 until Phase N is working
- **Test on FastAPI:** Every feature must work on the demo repo
- **Prompt iteration:** Budget 20% of each phase for prompt refinement
- **Native > Custom:** Use VS Code primitives wherever possible
- **Measure everything:** Eval harness is the differentiator

---

## Quick Reference

### Key Commands
```bash
# Generate extension
yo code

# Clone demo repo
git clone https://github.com/fastapi/fastapi.git

# Run eval
npm run eval

# Debug extension
F5 in VS Code

# Package extension
vsce package
```

### Key Files
- `src/bob/client.ts` - Single Bob interface
- `src/prompts/` - All prompts
- `src/features/` - Feature implementations
- `eval/` - Evaluation harness
- `ONBOARD_XRAY.md` - X-Ray output
- `ONBOARD_TASKS/` - Starter tasks

### Time Budget
- Phase 0: 2h
- Phase 1: 6h
- Phase 2: 5h
- Phase 3: 3h
- Phase 4: 4h
- Phase 5: 5h
- Phase 6: 4h
- Phase 7: 3h (buffer)
- **Total: 32h** (16h remaining for sleep/food)
