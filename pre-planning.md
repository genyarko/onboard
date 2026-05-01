Onboard — Build Guidelines for AI Coding Agents
What you're building
A VS Code extension called Onboard that uses IBM Bob as a backend to help engineers ramp on unfamiliar codebases. Submission for the IBM Bob Dev Day hackathon. Solo developer + AI agents. 48-hour deadline. Winning the hackathon is the goal.
Four features, in priority order
Build in this order. If time runs out, cut from the bottom.

Repo X-Ray — one command, produces architecture map (mermaid diagram), critical-path narrative, conventions cheat sheet, and "weird parts" callouts as a single markdown file rendered in VS Code preview.
Why-Is-This-Here — hover provider on any line. Sends line + ±30 lines context + git log -L for that range + linked PR/issue text from GitHub API to Bob. Bob returns a paragraph explaining the business reason for the code, not just what it does.
Day-N Plan — sidebar tree view. User configures role + seniority + focus area. Bob returns a 5-day learning plan as structured JSON. Each item links to a file or a starter task.
Starter Tasks — Bob scans for TODO/FIXME comments, picks 3, packages each as a markdown task card with hints and expected outcome.

Two pillars working cleanly beats four pillars half-broken. Don't add features that aren't on this list.
Architecture rules

VS Code extension, TypeScript. Use yo code scaffold. No web app, no Electron, no separate frontend.
Use VS Code primitives natively. Hover providers for #2. Tree view for #3. Markdown preview for #1 and #4. Don't build custom webviews unless a primitive cannot do the job.
Bob client is one module. src/bob/client.ts — single function ask(prompt, context). Every feature calls through it. No direct API calls scattered through feature code.
Prompts live in src/prompts/ as separate .ts files exporting template functions. Never inline a >5-line prompt in feature code.
Structured outputs everywhere. Bob returns JSON validated against Zod schemas. If validation fails, retry once, then surface the error. Never silently fall back to unstructured text.
No persistent state in v1. Run on demand. No caching, no database, no background indexing. Speed of build > speed of runtime.

Prompt engineering rules for Bob

Every prompt has three sections in this order: <role>, <task>, <output_format>. The output format section specifies the exact JSON schema Bob must return.
Pass repository context explicitly. Bob reads the whole repo, but tell Bob which parts matter for this specific call. Don't rely on Bob guessing.
For Repo X-Ray, decompose into 4 sequential calls (entry points → dependency walk → artifacts → weird-parts pass). One mega-prompt produces worse output than four scoped ones.
For Why-Is-This-Here, the prompt must instruct Bob to synthesize across code + git history + PR text, not summarize each separately. The output should explain why, not what.

Code quality bar
This is hackathon code, not production. But:

TypeScript strict mode on. No any unless you write a comment explaining why.
Each feature in its own folder under src/features/. Feature folders contain at most: command.ts (the VS Code command handler), prompt.ts (the Bob prompt), schema.ts (the Zod output schema), render.ts (how the result becomes a VS Code UI artifact).
Errors are user-facing. If Bob fails, show a VS Code notification with a useful message. Never silently swallow.
No dead code, no commented-out code, no console.log left behind. Judges might browse the repo.

Eval harness — non-negotiable
Build a eval/ directory with two scripts:

eval/faithfulness.ts — runs Why-Is-This-Here on 10 hand-labeled lines from the demo repo. Compares Bob's output to ground-truth explanations. Outputs out/faithfulness.csv.
eval/completeness.ts — runs Repo X-Ray on the demo repo. Checks whether 5 hand-labeled "weird parts" appear in the output. Outputs out/completeness.csv.

These run from one command: npm run eval. The CSVs go in the submission. Most teams will have zero measurement; this is a differentiator.
Demo repo
Use FastAPI (github.com/fastapi/fastapi). Clone it locally. Don't demo on the user's own code — judges cannot verify difficulty.
Hand-label the eval ground truth from real FastAPI PRs and known design decisions. Search FastAPI's issue tracker for "why" discussions; those are gold for the faithfulness eval.
What kills the submission

Custom UI where VS Code primitives exist. Use hover, tree views, markdown preview.
Demoing on synthetic code. Use FastAPI.
No pre-recorded demo video. Wifi fails. Record a 90-second walkthrough early.
Treating Bob as a swappable LLM. The pitch must explain why Bob specifically — full-repo context, multi-source synthesis. Wire prompts to leverage these.
Inline prompts >5 lines mixed into business logic. Move them to src/prompts/.
More than 4 features. Scope discipline wins.

Submission deck — three slides

Problem with a number. "First meaningful PR takes 6+ weeks for new hires." Cite Stripe Developer Coefficient report or Stack Overflow Developer Survey.
Demo. Embedded 90-second video. The Why-Is-This-Here moment is the hook.
Why Bob specifically. Concrete: "Repo X-Ray needs full-repo context — Bob reads the whole repo natively. Why-Is-This-Here needs multi-source synthesis across code + git + issues — Bob orchestrates that. With a generic LLM API, the context wiring would have taken 3x longer."

Build sequence
Phase 0: scaffold extension, wire Bob client, clone FastAPI       (2h)
Phase 1: Repo X-Ray (4 sequential prompts → markdown + mermaid)   (6h)
Phase 2: Why-Is-This-Here hover provider                          (5h)
Phase 3: Eval harness (faithfulness + completeness CSVs)          (3h)
Phase 4: Day-N Plan sidebar                                       (4h)
Phase 5: Starter Tasks                                            (5h)
Phase 6: Pre-record demo, polish README, build deck               (4h)
Phase 7: Buffer for breakage                                      (3h)
If behind at end of Phase 2, skip to Phase 3, then Phase 6. Eval + polish always beats a fourth half-built feature.
What "done" looks like for the demo
Open VS Code on a fresh clone of FastAPI. Run Onboard: X-Ray Repo — 30 seconds later, a markdown file opens with the architecture, conventions, and weird parts. Hover a non-obvious line in dependencies.py — a tooltip appears explaining the historical reason. Open the sidebar — a 5-day plan is waiting, configured for "backend engineer, mid-level, focus on dependency injection." Click Day 2's task — a markdown card opens with a real bug to fix.
If all four moments work end-to-end on a repo the user has never seen before, you have a winning submission.