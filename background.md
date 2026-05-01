The product, named
Onboard — a VS Code extension powered by Bob that turns "first day on a new codebase" into a guided, runnable experience.
Naming matters for the demo. "Onboard" is one syllable, judges remember it, and the verb is the value prop. Avoid clever names ("CodeSherpa", "RepoSensei") — they read as hackathon-cute and cost you a creativity point because they signal "we spent time on naming, not building."
The four pillars (these become your demo beats)

Repo X-Ray — one command, Bob produces an architecture map, dependency graph, "weird parts" callout, and a conventions cheat sheet. Output is a single navigable markdown file that opens in VS Code's preview.
Why-Is-This-Here — right-click any line, Bob synthesizes git blame + linked issues/PRs + surrounding context into a paragraph explaining the business reason. This is the 15-second wow.
Day-N Plan — Bob generates a 5-day personalized learning path based on declared role + seniority. Each day has a reading list (specific files, in order), a concept to internalize, and one runnable task.
Starter Tasks — Bob finds real low-stakes work in the repo (small bugs, missing tests, undocumented functions) and packages each as a self-contained task with hints, expected outcome, and a passing test waiting to validate the fix.

If you finish only the first two, you still have a strong submission. Pillars 3 and 4 are what push it from 16 to 19.
Phased build (48 hours, solo + AI agents)
Phase 0 — Foundation (2 hours)
Get Bob and watsonx accounts working. Pick the demo repo now, not later — this is the single most important early decision. You want something that's: real, recognizable to judges (so they trust the demo isn't rigged), has genuine "weird parts" (legacy decisions, non-obvious conventions), and is small enough that Bob can ingest the whole thing. My picks in priority order: FastAPI (clean but has interesting middleware/dependency-injection logic), httpx, or a deliberately gnarly older repo like Flask 0.x or early Django. Avoid your own code — judges can't verify it's hard.
Set up the VS Code extension scaffold (yo code), confirm it can call out to Bob, confirm it can read workspace files and git history. Done when you can right-click a line and pop a hello-world panel.
Phase 1 — Repo X-Ray (6 hours)
The hardest part is prompting, not coding. Bob needs to produce a consistent, well-structured architecture document, not a wall of text. Build it as a multi-step pipeline:

Bob enumerates entry points (main, app initialization, route definitions)
Bob walks the dependency graph from each entry point and identifies layers
Bob produces three artifacts: architecture diagram (mermaid), critical-path narrative (markdown), conventions cheat sheet (markdown)
Bob runs a "weird parts" pass — looks for code that contradicts the conventions it just identified, flags it with hypotheses

Render the output as a single markdown file with embedded mermaid diagrams, opened in VS Code preview. This is your opening demo shot — "point Bob at this repo, 30 seconds later you have this."
Phase 2 — Why-Is-This-Here (5 hours)
Right-click handler in the extension, sends Bob: the line + 30 lines of context + git log -L for that line range + linked issue/PR text from GitHub API for the commits that touched it. Bob synthesizes a paragraph.
The trick that makes this feel magical: don't just paste git blame. Have Bob reason about why the change happened by reading the PR description and connected issue. A line that says if tenant_id is None: return [] becomes "This guard was added in PR #4521 to fix a security bug where queries could leak across tenants when the auth middleware failed silently. The team chose to return empty rather than raise because the dashboard was crashing for free-tier users."
Build this as a hover provider so it feels native to VS Code. Native integration > custom UI on this rubric.
Phase 3 — Eval harness (3 hours)
Yes, build it. This is what separates you from 90% of teams. Two evals:

Faithfulness: hand-curate 10 lines from the demo repo with verified explanations (read the actual PRs). Run Why-Is-This-Here on each. Score Bob's answer for factual accuracy against ground truth.
Completeness: hand-curate 5 "weird parts" in the demo repo that you confirmed are actually weird. Run Repo X-Ray. Did it find them?

Output: a CSV. Show this in the deck. Most hackathon teams have zero measurement; one slide with real numbers is disproportionately persuasive.
Phase 4 — Day-N Plan (4 hours)
Configure form: role, seniority, focus area. Bob produces a 5-day plan as structured JSON (Pydantic schema), rendered as a checklist sidebar in VS Code. Each item links to a file or a starter task.
Don't over-engineer this. The plan is mostly impressive because it exists and is personalized, not because Day 4 is brilliant.
Phase 5 — Starter Tasks (5 hours)
This is the highest-variance pillar. Easy version: Bob scans for TODO/FIXME comments, picks 3, packages each. Harder version: Bob runs a static analysis pass and picks low-stakes refactors. Hardest version: Bob identifies missing test coverage and generates stub tests.
Cut to easy version if you're behind schedule. A working easy version beats a half-broken hard version every time.
Phase 6 — Polish + demo prep (4 hours)
Pre-record the full demo (3 min, 90 sec, 30 sec versions). Wifi at hackathons fails. Pre-recordings are the single highest-ROI insurance you can buy. Write the README to read like a product page, not a hackathon submission. Make a one-slide architecture diagram.
Phase 7 — Buffer (3 hours)
Don't skip this. Things break.
Total: ~32 hours of work, ~16 hours for sleep/food/the inevitable account-provisioning issue.
What pushes you from 17 to 19
The submission deck — most teams under-invest here. Three slides:

The problem, with a real number. "New engineers take 6+ weeks to first meaningful PR. At enterprise scale, this costs $X." Cite a real source (Stripe Developer Coefficient report, Stack Overflow survey).
The demo. Embed the 90-second video. Don't just describe — show.
Why this works because of Bob specifically. Not "we used Bob." Concretely: "Repo X-Ray needs full-repo context — Bob reads the whole repo. Why-Is-This-Here needs multi-source synthesis across code + git + issues — Bob orchestrates that natively. We tried doing this with a generic LLM API and it took 3x longer to wire up the context."

That third slide is what pushes "application of IBM technology" from 4 to 5. Most teams treat the IBM tech as substitutable; you're explicitly arguing it isn't.
What kills you

Building too many features shallowly. Two pillars demoed cleanly beats four pillars half-working.
Custom UI when VS Code primitives exist. Use hover providers, code lenses, the markdown preview, the sidebar tree view. Native = polished = usability points.
Demoing on your own code. Judges can't verify difficulty. Demo on a public repo they recognize.
Not pre-recording. Live demos at hackathons fail roughly 30% of the time. Don't be that team.