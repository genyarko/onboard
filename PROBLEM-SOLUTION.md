# Onboard: The IBM Bob-Powered Repo Oracle

## The Problem: The "Onboarding Tax"
When a developer joins a new team, they don’t just face a coding challenge; they face a context challenge. Modern codebases are massive, often exceeding 10,000 files. Traditional documentation is notoriously stale, and the "Why" behind critical architectural decisions is buried under years of Git history and thousands of closed Pull Requests. 

This creates the "Onboarding Tax": new hires typically take **six weeks** to become fully productive. During this time, they rely heavily on senior engineers for "shadowing," interrupting the team's most expensive resources to ask basic questions about system flow and business logic.

## The Solution: Onboard
**Onboard** is a VS Code extension that transforms the first day on a new codebase. It acts as an automated mentor, providing instant, role-specific context to new hires. 

### Target Users
*   **New Software Engineers:** From juniors to seniors who need to hit the ground running.
*   **Engineering Managers:** Looking to reduce the time-to-productivity for new hires.
*   **Onboarding Mentors:** Who want to automate the "discovery" phase of onboarding.

### How Users Interact
Users interact with Onboard directly within their IDE through the Command Palette, a dedicated Sidebar, and Context Menus. They can run a **Repo X-Ray** to visualize the architecture, right-click any line of code to ask **"Why Is This Here?"**, or generate a personalized **Day-N Plan** that maps out their first five days based on their specific role (e.g., Backend vs. Frontend).

## Why It’s Unique & Creative: The IBM Bob Advantage
While standard AI assistants are limited to the file currently open on the screen, Onboard is uniquely powered by **IBM Bob’s full-repository context**. 

Onboard doesn't just explain what a function does; it acts as a "Repo Oracle." By utilizing Bob to synthesize thousands of files, PR descriptions, and commit messages simultaneously, Onboard can explain the **business reasoning** behind a line of code—something no other tool does. 

### Innovation Highlights:
1.  **Synthesized Intent:** Unlike tools that just "read code," Onboard cross-references code with Git history to reveal *why* a hack was implemented three years ago.
2.  **Role-Specific Roadmaps:** It doesn't give a generic tour. It analyzes the repo's actual complexity to build a custom learning path for a developer's specific level and tech stack.
3.  **Day-One Impact:** The "Starter Tasks" feature uses Bob to identify low-risk, high-value tasks, providing the specific hints and validation steps needed for a new hire to make their first commit on their first day.

Onboard doesn't just help you read code; it helps you understand the **soul of the repository**, compressing weeks of friction into five days of focused growth.
