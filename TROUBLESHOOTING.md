# Troubleshooting Guide

> Common issues and solutions for the Onboard VS Code extension

## Table of Contents

- [Installation Issues](#installation-issues)
- [Bob API Connection](#bob-api-connection)
- [Feature-Specific Issues](#feature-specific-issues)
- [Performance Problems](#performance-problems)
- [Extension Not Loading](#extension-not-loading)
- [Getting Help](#getting-help)

---

## Installation Issues

### Extension Won't Install

**Symptom:** VS Code shows "Extension installation failed" error

**Solutions:**

1. **Check VS Code version:**
   ```bash
   code --version
   ```
   Requires VS Code 1.85.0 or higher. Update if needed.

2. **Clear extension cache:**
   - Close VS Code
   - Delete: `%USERPROFILE%\.vscode\extensions` (Windows) or `~/.vscode/extensions` (macOS/Linux)
   - Restart VS Code and reinstall

3. **Check Node.js version:**
   ```bash
   node --version
   ```
   Requires Node.js 20.x or higher.

### Dependencies Won't Install

**Symptom:** `npm install` fails with errors

**Solutions:**

1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   cd onboard-extension
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check for conflicting global packages:**
   ```bash
   npm list -g --depth=0
   ```
   Uninstall any conflicting TypeScript or VS Code extension packages.

3. **Use exact Node version:**
   ```bash
   nvm install 20.11.0
   nvm use 20.11.0
   npm install
   ```

---

## Bob API Connection

### "Bob API Key Not Found" Error

**Symptom:** Extension shows "Bob API key not configured" notification

**Solutions:**

1. **Set environment variable (Windows PowerShell):**
   ```powershell
   $env:BOB_API_KEY = "your-api-key-here"
   ```

2. **Set environment variable (macOS/Linux):**
   ```bash
   export BOB_API_KEY="your-api-key-here"
   ```

3. **Restart VS Code after setting:**
   - Close all VS Code windows
   - Reopen from terminal where environment variable was set

4. **Verify variable is set:**
   ```bash
   # Windows PowerShell
   echo $env:BOB_API_KEY
   
   # macOS/Linux
   echo $BOB_API_KEY
   ```

### "Bob API Request Failed" Error

**Symptom:** Commands fail with network or API errors

**Solutions:**

1. **Check API key validity:**
   - Verify key hasn't expired
   - Test with curl:
     ```bash
     curl -H "Authorization: Bearer YOUR_API_KEY" https://api.ibm.com/bob/v1/health
     ```

2. **Check network connectivity:**
   - Verify firewall isn't blocking requests
   - Test proxy settings if behind corporate firewall
   - Check VPN connection if required

3. **Increase timeout:**
   - Large repositories may need longer timeouts
   - Edit `src/bob/client.ts`:
     ```typescript
     const timeout = 120000; // Increase from 60000 to 120000
     ```

4. **Check Bob service status:**
   - Visit IBM Bob status page
   - Check for scheduled maintenance

### Rate Limiting Errors

**Symptom:** "Too many requests" or 429 errors

**Solutions:**

1. **Wait before retrying:**
   - Rate limits typically reset after 1 minute
   - Avoid running multiple commands simultaneously

2. **Reduce repository size:**
   - Use `.bobignore` to exclude large directories:
     ```
     node_modules/
     dist/
     build/
     .git/
     *.log
     ```

3. **Contact IBM for rate limit increase:**
   - Provide use case and repository size
   - Request enterprise tier if available

---

## Feature-Specific Issues

### Repo X-Ray

#### "Analysis Timed Out" Error

**Symptom:** X-Ray command runs for >2 minutes and fails

**Solutions:**

1. **Reduce repository scope:**
   - Add `.bobignore` file to exclude:
     - `node_modules/`, `vendor/`, `dist/`, `build/`
     - Test files if not needed for architecture
     - Documentation directories

2. **Split large monorepos:**
   - Run X-Ray on individual services/modules
   - Combine results manually

3. **Check repository size:**
   ```bash
   # Count files
   git ls-files | wc -l
   
   # Check total size
   du -sh .
   ```
   Recommended: <10,000 files, <500MB

#### Mermaid Diagram Not Rendering

**Symptom:** X-Ray output shows raw Mermaid code instead of diagram

**Solutions:**

1. **Install Mermaid extension:**
   - Search for "Markdown Preview Mermaid Support" in VS Code
   - Install and reload window

2. **Use external viewer:**
   - Copy Mermaid code
   - Paste into https://mermaid.live

3. **Check Mermaid syntax:**
   - Look for syntax errors in generated code
   - Report issues with example repository

### Why Is This Here?

#### "No Git History Found" Error

**Symptom:** Right-click command shows "Cannot analyze: no git history"

**Solutions:**

1. **Verify git repository:**
   ```bash
   git status
   ```
   Must be inside a git repository.

2. **Check file is tracked:**
   ```bash
   git ls-files | grep filename
   ```
   File must be committed to git.

3. **Ensure git history exists:**
   ```bash
   git log --oneline filename
   ```
   File must have at least one commit.

#### Explanation Seems Inaccurate

**Symptom:** Why-Is-This-Here provides generic or incorrect explanation

**Solutions:**

1. **Check git history depth:**
   ```bash
   git log --all --oneline | wc -l
   ```
   Shallow clones (<100 commits) may lack context.

2. **Fetch full history:**
   ```bash
   git fetch --unshallow
   ```

3. **Verify linked issues/PRs:**
   - Ensure commit messages reference issues (#123)
   - Check if issue tracker is accessible

4. **Provide feedback:**
   - Report inaccuracies with:
     - File path and line number
     - Expected vs. actual explanation
     - Link to relevant PR/issue

### Day-N Plan

#### Sidebar Not Showing

**Symptom:** Day-N Plan view doesn't appear in sidebar

**Solutions:**

1. **Activate view manually:**
   - View → Open View → "Day-N Plan"

2. **Reset workspace:**
   - Close folder
   - Reopen folder
   - Run "Onboard: Generate 5-Day Plan"

3. **Check extension activation:**
   - Open Output panel
   - Select "Onboard" from dropdown
   - Look for activation errors

#### Plan Seems Generic

**Symptom:** Generated plan doesn't match repository specifics

**Solutions:**

1. **Reconfigure preferences:**
   - Click gear icon in Day-N Plan view
   - Update role, seniority, focus area
   - Regenerate plan

2. **Provide more context:**
   - Ensure README.md exists and is detailed
   - Add ARCHITECTURE.md or similar docs
   - Run Repo X-Ray first for better context

3. **Customize manually:**
   - Edit generated plan markdown
   - Add repository-specific tasks
   - Save as template for team

### Starter Tasks

#### No Tasks Found

**Symptom:** "Find Starter Tasks" returns empty list

**Solutions:**

1. **Check for markers:**
   ```bash
   # Search for TODO/FIXME
   git grep -i "TODO\|FIXME"
   ```

2. **Add task markers:**
   - Add `// TODO:` comments to code
   - Use `FIXME:` for bugs
   - Document missing tests

3. **Lower difficulty threshold:**
   - Edit `src/features/starter-tasks/prompt.ts`
   - Adjust complexity criteria

4. **Check ignored files:**
   - Verify `.bobignore` isn't excluding task-rich directories
   - Temporarily disable ignore patterns

---

## Performance Problems

### Extension Slows Down VS Code

**Symptom:** VS Code becomes unresponsive when extension is active

**Solutions:**

1. **Disable hover provider:**
   - Settings → Extensions → Onboard
   - Uncheck "Enable Why-Is-This-Here Hover"

2. **Reduce file watching:**
   - Add to `.bobignore`:
     ```
     **/*.log
     **/node_modules/**
     **/dist/**
     ```

3. **Increase VS Code memory:**
   - Add to VS Code settings:
     ```json
     {
       "extensions.experimental.affinity": {
         "onboard": 1
       }
     }
     ```

4. **Use on-demand features:**
   - Avoid auto-running commands
   - Trigger features manually when needed

### High Memory Usage

**Symptom:** Extension uses >500MB RAM

**Solutions:**

1. **Clear cache:**
   ```bash
   rm -rf ~/.bob/cache
   ```

2. **Restart extension host:**
   - Command Palette → "Developer: Restart Extension Host"

3. **Reduce concurrent operations:**
   - Run one feature at a time
   - Wait for completion before next command

---

## Extension Not Loading

### "Extension Activation Failed" Error

**Symptom:** Extension shows error on VS Code startup

**Solutions:**

1. **Check extension logs:**
   - Help → Toggle Developer Tools
   - Console tab → Filter "onboard"
   - Look for stack traces

2. **Verify package.json:**
   ```bash
   cd onboard-extension
   npm run compile
   ```
   Check for TypeScript errors.

3. **Reinstall extension:**
   - Uninstall from Extensions view
   - Delete `~/.vscode/extensions/onboard-*`
   - Reinstall from VSIX or marketplace

4. **Check VS Code compatibility:**
   - Verify `engines.vscode` in package.json matches your version
   - Update VS Code if needed

### Commands Not Appearing

**Symptom:** "Onboard:" commands missing from Command Palette

**Solutions:**

1. **Reload window:**
   - Command Palette → "Developer: Reload Window"

2. **Check activation events:**
   - Open `package.json`
   - Verify `activationEvents` includes `"onStartupFinished"`

3. **Manual activation:**
   - Open any file in workspace
   - Extension should activate automatically

---

## Getting Help

### Before Reporting Issues

1. **Check this guide** for known solutions
2. **Review logs:**
   - Output panel → "Onboard"
   - Developer Tools → Console
3. **Test with demo repository:**
   ```bash
   git clone https://github.com/fastapi/fastapi.git
   ```
   Verify issue reproduces on known-good repo

### Reporting Bugs

Include in your report:

1. **Environment:**
   - VS Code version: `code --version`
   - Node.js version: `node --version`
   - OS: Windows/macOS/Linux + version
   - Extension version: Check Extensions view

2. **Steps to reproduce:**
   - Exact commands run
   - Repository characteristics (size, language)
   - Expected vs. actual behavior

3. **Logs:**
   - Output panel logs (sanitize sensitive data)
   - Developer Tools console errors
   - Screenshots if UI-related

4. **Minimal reproduction:**
   - Simplest repository that shows issue
   - Specific file/line if applicable

### Contact Channels

- **GitHub Issues:** [Repository URL]/issues
- **Email:** [Contact email]
- **Slack:** #onboard-support (if available)

### Feature Requests

Use GitHub Issues with:
- Clear use case description
- Expected behavior
- Why existing features don't solve it
- Willingness to contribute (optional)

---

## FAQ

### Q: Can I use Onboard without Bob API?

**A:** No, Onboard requires IBM Bob for all core features. Bob provides the full-repository context and multi-source synthesis that makes the extension work.

### Q: Does Onboard work with private repositories?

**A:** Yes, Onboard works with any local git repository. Your code never leaves your machine except for Bob API calls (which are encrypted and follow IBM's data policies).

### Q: Can I customize the prompts?

**A:** Yes! Edit files in `src/features/*/prompt.ts`. See [PROMPTS.md](PROMPTS.md) for documentation.

### Q: How much does Bob API cost?

**A:** Contact IBM for pricing. Onboard is designed to minimize API calls through caching and efficient prompts.

### Q: Can I use Onboard on monorepos?

**A:** Yes, but performance depends on size. Use `.bobignore` to exclude irrelevant directories. Consider running features on individual services.

### Q: Does Onboard support languages other than TypeScript?

**A:** Yes! Onboard works with any language. The demo uses FastAPI (Python), but it supports Java, Go, Rust, etc.

### Q: Can I contribute to Onboard?

**A:** Yes! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Q: How accurate is Why-Is-This-Here?

**A:** See [eval/README.md](eval/README.md) for quantitative accuracy metrics. Typical accuracy is >70% on well-documented repositories.

---

## Still Stuck?

If this guide doesn't solve your issue:

1. Search existing GitHub issues
2. Ask in community channels
3. Open a new issue with full details

We're here to help! 🚀
