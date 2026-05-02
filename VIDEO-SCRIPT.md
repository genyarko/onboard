# Onboard Extension - Video Walkthrough Script

> 90-second demo script for showcasing the Onboard VS Code extension

## 🎬 Video Overview

**Duration:** 90 seconds
**Target Audience:** Hackathon judges, potential users, engineering teams
**Goal:** Demonstrate all four features on a real, recognizable codebase (FastAPI)

---

## 📋 Pre-Recording Checklist

- [ ] VS Code with Onboard extension installed
- [ ] FastAPI repository cloned and open
- [ ] Bob API key configured
- [ ] Screen recording software ready (OBS, QuickTime, etc.)
- [ ] Audio tested (clear, no background noise)
- [ ] Window size: 1920x1080 or 1280x720
- [ ] Font size: 16-18pt for readability
- [ ] Hide personal information (API keys, file paths)

---

## 🎯 Script Breakdown

### Opening (0:00 - 0:05) - 5 seconds

**Visual:** VS Code with FastAPI repository open

**Narration:**
> "Meet Onboard - an AI-powered VS Code extension that transforms your first day on a new codebase."

**Actions:**
- Show FastAPI file tree in Explorer
- Highlight extension icon in Activity Bar

---

### Feature 1: Repo X-Ray (0:05 - 0:30) - 25 seconds

**Visual:** Command Palette → Repo X-Ray execution → Results

**Narration:**
> "Let's start with Repo X-Ray. In just 30 seconds, it analyzes the entire repository and generates comprehensive documentation."

**Actions:**
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "Onboard: X-Ray Repository"
3. Press Enter
4. Show progress: "Analyzing architecture..."
5. Results open in markdown preview

**Narration (while results load):**
> "It creates an architecture diagram, explains the critical path, documents conventions, and even detects unusual code patterns."

**Visual Highlights:**
- **Architecture Diagram** (5 sec): Zoom in on Mermaid diagram
  - Point out layers: Routes → Services → Models
  - Show dependencies between layers

- **Weird Parts** (5 sec): Scroll to weird parts section
  - Highlight one finding: "Manual dependency resolution"
  - Show file path and explanation

**Key Message:**
> "Everything you need to understand the architecture - automatically generated."

---

### Feature 2: Why Is This Here (0:30 - 0:50) - 20 seconds

**Visual:** Open file → Right-click → Explanation popup

**Narration:**
> "Now let's understand why specific code exists. I'll right-click on this non-obvious line..."

**Actions:**
1. Open `fastapi/routing.py`
2. Navigate to line 156 (manual dependency resolution)
3. Right-click on the line
4. Select "Onboard: Why Is This Here?"
5. Wait 3 seconds for analysis
6. Explanation appears

**Visual Highlights:**
- **Summary** (3 sec): "Manual dependency resolution to handle circular dependencies"
- **Business Reason** (5 sec): Scroll through explanation
  - "Added in PR #4521 to fix critical bug..."
  - "Maintains backward compatibility..."
- **References** (2 sec): Show linked PR and commit

**Narration:**
> "It synthesizes git history, pull requests, and issues to explain the business reason - not just what the code does, but why it exists."

**Key Message:**
> "No more guessing. No more interrupting senior engineers."

---

### Feature 3: Day-N Plan (0:50 - 1:10) - 20 seconds

**Visual:** Sidebar → Configuration → Generated plan

**Narration:**
> "Next, let's create a personalized learning path. I'll configure my role as a backend engineer..."

**Actions:**
1. Click "Day-N Plan" in sidebar
2. Click "Generate Plan" button
3. Quick picks appear:
   - Select "Backend Engineer"
   - Select "Mid-Level"
   - Select "API Development"
4. Wait 5 seconds for generation
5. Plan appears in tree view

**Visual Highlights:**
- **Day 1** (3 sec): Expand Day 1 node
  - Show reading list with file paths
  - Show task: "Fix a typo in documentation"

- **Day 2** (3 sec): Expand Day 2 node
  - Show reading list: routing.py, dependencies/
  - Show task: "Trace a request through the system"

- **Day 5** (2 sec): Expand Day 5 node
  - Show task: "Implement a feature or fix a real bug"

**Narration:**
> "In 20 seconds, I have a complete 5-day onboarding plan tailored to my role and experience level."

**Key Message:**
> "From 6 weeks to 5 days."

---

### Feature 4: Starter Tasks (1:10 - 1:25) - 15 seconds

**Visual:** Command Palette → Task cards

**Narration:**
> "Finally, let's find some beginner-friendly work."

**Actions:**
1. Open Command Palette
2. Type "Onboard: Find Starter Tasks"
3. Press Enter
4. Wait 5 seconds
5. Task cards appear

**Visual Highlights:**
- **Task 1** (5 sec): Scroll to first task
  - Title: "Add Email Validation"
  - Difficulty: Easy | Time: 15-20 minutes
  - Show hints and expected outcome

- **Task 2** (3 sec): Scroll to second task
  - Title: "Document the Cache Utility"
  - Show file path and line number

**Narration:**
> "Each task includes hints, expected outcomes, and validation steps. Perfect for building confidence."

**Key Message:**
> "Make your first contribution on day one."

---

### Closing (1:25 - 1:30) - 5 seconds

**Visual:** Split screen showing all four features

**Narration:**
> "Onboard: AI-powered onboarding that works on any codebase. Built with IBM Bob."

**Actions:**
- Show quick montage:
  - Repo X-Ray diagram
  - Why Is This Here explanation
  - Day-N Plan tree view
  - Starter Tasks cards

**Text Overlay:**
```
Onboard
Transform onboarding from weeks to days

Built with IBM Bob
github.com/your-repo
```

---

## 🎨 Visual Guidelines

### Screen Layout
- **Font Size:** 16-18pt (readable on mobile)
- **Theme:** Dark theme (better contrast)
- **Zoom Level:** 125-150% for demos
- **Hide:** Minimap, breadcrumbs, status bar (optional)

### Highlighting
- Use cursor to point at important elements
- Zoom in on key sections (architecture diagram, explanations)
- Use VS Code's "Highlight Line" feature for code

### Transitions
- Smooth scrolling (not too fast)
- Brief pause (1-2 sec) on important information
- Clear visual separation between features

---

## 🎤 Narration Tips

### Tone
- **Confident:** You know the product well
- **Enthusiastic:** Show excitement about the features
- **Clear:** Speak slowly and enunciate
- **Concise:** Every word counts in 90 seconds

### Pacing
- **Opening:** Moderate pace, set the stage
- **Features:** Slightly faster, show efficiency
- **Closing:** Slow down, emphasize key message

### Emphasis
- **Key phrases:**
  - "30 seconds" (Repo X-Ray speed)
  - "Business reason" (Why Is This Here value)
  - "5 days" (Day-N Plan outcome)
  - "Day one" (Starter Tasks impact)

---

## 📊 Alternative Versions

### 30-Second Version (Elevator Pitch)

**Script:**
> "Onboard is an AI-powered VS Code extension that transforms codebase onboarding. In 30 seconds, it generates architecture documentation. Right-click any line to understand why it exists. Get a personalized 5-day learning plan. Find beginner-friendly tasks. Built with IBM Bob for full-repository context. Transform onboarding from weeks to days."

**Visuals:**
- Quick cuts between features (5-7 sec each)
- Focus on results, not process

---

### 3-Minute Version (Deep Dive)

**Additional Content:**
- Show evaluation metrics (>70% accuracy)
- Demonstrate hover provider for Why Is This Here
- Show Day-N Plan progress tracking
- Explain how it works (Bob API, git history, etc.)
- Show customization options

---

### 5-Minute Version (Tutorial)

**Additional Content:**
- Installation and setup
- Configuration (API key, preferences)
- Detailed walkthrough of each feature
- Tips and best practices
- Q&A addressing common questions

---

## 🎬 Recording Tips

### Before Recording
1. **Practice:** Run through script 3-5 times
2. **Timing:** Use a timer to stay within 90 seconds
3. **Backup:** Have a backup recording plan
4. **Environment:** Quiet room, good lighting

### During Recording
1. **Breathe:** Take natural pauses
2. **Mistakes:** Don't stop, keep going (edit later)
3. **Energy:** Maintain enthusiasm throughout
4. **Cursor:** Use cursor to guide viewer's attention

### After Recording
1. **Review:** Watch the full recording
2. **Edit:** Cut dead time, add transitions
3. **Audio:** Normalize audio levels, remove noise
4. **Captions:** Add subtitles for accessibility
5. **Export:** 1080p, 30fps, MP4 format

---

## 📝 B-Roll Suggestions

### Code Snippets
- FastAPI routing code
- Dependency injection examples
- Test files

### UI Elements
- Command Palette
- Sidebar tree views
- Markdown preview
- Hover tooltips

### Diagrams
- Architecture diagram (Mermaid)
- Dependency graph
- Request flow visualization

### Text Overlays
- Feature names
- Key statistics (30 seconds, 5 days, >70% accuracy)
- Call to action (GitHub link, website)

---

## 🎯 Key Messages to Emphasize

1. **Speed:** "30 seconds to comprehensive documentation"
2. **Accuracy:** ">70% accuracy, quantitatively measured"
3. **Context:** "Business reasoning, not just code explanation"
4. **Personalization:** "Tailored to your role and experience"
5. **Real Codebase:** "Works on FastAPI - a real, complex project"
6. **IBM Bob:** "Powered by IBM Bob's full-repository context"

---

## 📊 Success Metrics

### Viewer Engagement
- Watch time: >60 seconds (67% completion)
- Click-through rate: >5% to GitHub
- Social shares: >10 shares

### Demo Quality
- Clear audio: No background noise
- Smooth visuals: No lag or stuttering
- Professional: No typos or errors
- Timing: Within 90 seconds ±5 seconds

---

## 🔗 Call to Action

**End Screen (5 seconds):**
```
Try Onboard Today
github.com/your-repo/onboard

Built for IBM Bob Dev Day Hackathon 2026
```

**Description:**
```
Onboard - AI-Powered Codebase Onboarding

Transform your first day on a new codebase with:
✅ 30-second architecture analysis
✅ Business context for any line of code
✅ Personalized 5-day learning plans
✅ Beginner-friendly starter tasks

Built with IBM Bob for full-repository context.

🔗 GitHub: github.com/your-repo/onboard
📖 Docs: github.com/your-repo/onboard/docs
🎥 Walkthrough: github.com/your-repo/onboard/WALKTHROUGH.md

#IBMBob #VSCode #AI #DeveloperTools #Onboarding
```

---

## 🎬 Production Checklist

- [ ] Script finalized and practiced
- [ ] Recording environment prepared
- [ ] Screen resolution set (1920x1080)
- [ ] Font size increased (16-18pt)
- [ ] Personal information hidden
- [ ] FastAPI repository ready
- [ ] Extension working correctly
- [ ] Audio tested and clear
- [ ] Recording software configured
- [ ] Backup plan ready
- [ ] Timer visible during recording
- [ ] Energy drink consumed ☕

---

## 📹 Post-Production

### Editing
1. **Trim:** Remove dead time at start/end
2. **Transitions:** Add smooth transitions between features
3. **Zoom:** Zoom in on important details
4. **Annotations:** Add arrows or highlights (optional)
5. **Music:** Add subtle background music (optional)

### Audio
1. **Normalize:** Consistent volume throughout
2. **Noise Reduction:** Remove background noise
3. **EQ:** Enhance voice clarity
4. **Compression:** Even out volume spikes

### Captions
1. **Subtitles:** Add for accessibility
2. **Timing:** Sync with narration
3. **Formatting:** Clear, readable font
4. **Language:** English (add translations later)

### Export
- **Format:** MP4 (H.264)
- **Resolution:** 1920x1080 (1080p)
- **Frame Rate:** 30fps
- **Bitrate:** 8-10 Mbps
- **Audio:** AAC, 192 kbps

---

## 🚀 Distribution

### Platforms
- **YouTube:** Main hosting platform
- **Twitter/X:** 90-second clip
- **LinkedIn:** Professional audience
- **Reddit:** r/programming, r/vscode
- **Hacker News:** Show HN post
- **Dev.to:** Embedded in blog post

### Optimization
- **Title:** "Onboard: AI-Powered Codebase Onboarding in 90 Seconds"
- **Thumbnail:** Split screen of all four features
- **Tags:** IBM Bob, VS Code, AI, Developer Tools, Onboarding
- **Description:** Include links and key features

---

## 💡 Pro Tips

1. **Show, Don't Tell:** Let the features speak for themselves
2. **Real Codebase:** Using FastAPI proves it works on real projects
3. **Quantitative Metrics:** Mention >70% accuracy for credibility
4. **Smooth Demo:** Practice until it's second nature
5. **Energy:** Enthusiasm is contagious
6. **Backup:** Have a backup recording ready
7. **Feedback:** Get feedback before final version

---

**Good luck with your demo! 🎬🚀**

---

**Last Updated:** 2026-05-02
**Version:** 1.0.0
