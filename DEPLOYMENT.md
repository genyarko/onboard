# Deployment Guide

> Instructions for packaging, publishing, and deploying the Onboard VS Code extension.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Testing](#local-testing)
- [Packaging](#packaging)
- [Publishing to VS Code Marketplace](#publishing-to-vs-code-marketplace)
- [Private Distribution](#private-distribution)
- [CI/CD Setup](#cicd-setup)
- [Version Management](#version-management)
- [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Tools

1. **Node.js** 20.x or higher
2. **npm** 9.x or higher
3. **vsce** (Visual Studio Code Extension Manager)
   ```bash
   npm install -g @vscode/vsce
   ```
4. **VS Code** 1.85.0 or higher (for testing)

### Required Accounts

- **Azure DevOps** account (for VS Code Marketplace publishing)
- **Personal Access Token** with Marketplace (Publish) scope

### Environment Setup

```bash
# Set up environment variables
export VSCE_PAT="your-personal-access-token"
export BOB_API_KEY="your-bob-api-key"  # For testing
```

---

## Local Testing

### 1. Install Dependencies

```bash
cd onboard-extension
npm install
```

### 2. Compile TypeScript

```bash
npm run compile
```

### 3. Run Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "Bob Client"

# Run with coverage
npm run test:coverage
```

### 4. Test in Extension Development Host

```bash
# Open in VS Code
code .

# Press F5 to launch Extension Development Host
# Test all features in the new window
```

### 5. Run Evaluation Harness

```bash
cd ../eval
npm install
npm run eval

# Check results
cat out/faithfulness-results.csv
cat out/completeness-results.csv
```

### 6. Manual Testing Checklist

- [ ] Repo X-Ray generates complete analysis
- [ ] Why-Is-This-Here provides accurate explanations
- [ ] Day-N Plan creates personalized learning paths
- [ ] Starter Tasks finds appropriate tasks
- [ ] All commands appear in Command Palette
- [ ] Error messages are user-friendly
- [ ] Performance is acceptable (< 60s for X-Ray)

---

## Packaging

### 1. Pre-Package Checklist

- [ ] All tests pass
- [ ] Version number updated in `package.json`
- [ ] CHANGELOG.md updated
- [ ] README.md is current
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without warnings

### 2. Update Version

```bash
# Semantic versioning: MAJOR.MINOR.PATCH
npm version patch  # Bug fixes
npm version minor  # New features
npm version major  # Breaking changes
```

### 3. Build for Production

```bash
# Clean previous builds
rm -rf out/
rm -f *.vsix

# Compile with production settings
npm run vscode:prepublish

# Verify output
ls -la out/
```

### 4. Create VSIX Package

```bash
# Package extension
vsce package

# Output: onboard-X.Y.Z.vsix
```

### 5. Test VSIX Package

```bash
# Install locally
code --install-extension onboard-X.Y.Z.vsix

# Test in a fresh VS Code window
# Verify all features work

# Uninstall after testing
code --uninstall-extension onboard-team.onboard
```

---

## Publishing to VS Code Marketplace

### 1. First-Time Setup

#### Create Publisher Account

1. Go to [Visual Studio Marketplace](https://marketplace.visualstudio.com/)
2. Sign in with Azure DevOps account
3. Create a publisher:
   - Publisher ID: `onboard-team`
   - Display name: `Onboard Team`
   - Description: `AI-powered codebase onboarding tools`

#### Generate Personal Access Token

1. Go to Azure DevOps → User Settings → Personal Access Tokens
2. Create new token:
   - Name: `vsce-publish`
   - Organization: All accessible organizations
   - Scopes: Marketplace (Publish)
   - Expiration: 90 days (or custom)
3. Copy token immediately (shown only once)

#### Login to vsce

```bash
vsce login onboard-team
# Enter your Personal Access Token when prompted
```

### 2. Publish New Version

```bash
# Publish to marketplace
vsce publish

# Or publish with specific version bump
vsce publish patch  # 0.1.0 → 0.1.1
vsce publish minor  # 0.1.0 → 0.2.0
vsce publish major  # 0.1.0 → 1.0.0
```

### 3. Verify Publication

1. Go to [Marketplace](https://marketplace.visualstudio.com/)
2. Search for "Onboard"
3. Verify:
   - Correct version number
   - README displays correctly
   - Screenshots/GIFs load
   - Install button works

### 4. Monitor Installation

```bash
# Check statistics
vsce show onboard-team.onboard --json
```

---

## Private Distribution

### For Internal/Enterprise Use

#### Option 1: VSIX File Distribution

```bash
# Package extension
vsce package

# Distribute onboard-X.Y.Z.vsix via:
# - Internal file server
# - Email
# - Shared drive
# - Internal package registry
```

**Installation Instructions for Users:**
```bash
# Install from VSIX
code --install-extension onboard-X.Y.Z.vsix

# Or via VS Code UI:
# Extensions → ... → Install from VSIX
```

#### Option 2: Private Extension Gallery

Set up a private gallery using:
- [Azure DevOps Extensions](https://docs.microsoft.com/en-us/azure/devops/extend/)
- [Open VSX Registry](https://open-vsx.org/)
- Custom extension gallery server

#### Option 3: Git Repository

```bash
# Users can install directly from git
code --install-extension git+https://github.com/your-org/onboard.git
```

---

## CI/CD Setup

### GitHub Actions Workflow

Create `.github/workflows/release.yml`:

```yaml
name: Release Extension

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd onboard-extension
          npm ci
      
      - name: Run tests
        run: |
          cd onboard-extension
          npm test
      
      - name: Run evaluation
        run: |
          cd eval
          npm ci
          npm run eval
      
      - name: Package extension
        run: |
          cd onboard-extension
          npm install -g @vscode/vsce
          vsce package
      
      - name: Publish to Marketplace
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
        run: |
          cd onboard-extension
          vsce publish -p $VSCE_PAT
      
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: onboard-extension/*.vsix
          body_path: CHANGELOG.md
```

### Required Secrets

Add to GitHub repository settings:
- `VSCE_PAT` - Personal Access Token for VS Code Marketplace

### Triggering a Release

```bash
# Tag a new version
git tag v0.1.0
git push origin v0.1.0

# GitHub Actions will automatically:
# 1. Run tests
# 2. Run evaluation
# 3. Package extension
# 4. Publish to marketplace
# 5. Create GitHub release
```

---

## Version Management

### Semantic Versioning

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0) - Breaking changes
- **MINOR** (0.1.0) - New features, backward compatible
- **PATCH** (0.0.1) - Bug fixes, backward compatible

### Pre-release Versions

```bash
# Create pre-release
vsce publish --pre-release

# Version format: 0.1.0-alpha.1
```

### Version Bumping

```bash
# Update package.json version
npm version patch -m "Release v%s"

# This will:
# 1. Update version in package.json
# 2. Create git commit
# 3. Create git tag
```

### Changelog Management

Update `CHANGELOG.md` before each release:

```markdown
## [0.2.0] - 2026-05-15

### Added
- New feature X
- New feature Y

### Changed
- Improved performance of Z

### Fixed
- Bug in feature A
- Issue with B
```

---

## Rollback Procedures

### Unpublish a Version

```bash
# Unpublish specific version (use with caution!)
vsce unpublish onboard-team.onboard@0.1.1

# This removes the version from marketplace
# Users who installed it can still use it
```

### Publish Previous Version

```bash
# Checkout previous version
git checkout v0.1.0

# Rebuild and publish
cd onboard-extension
npm install
npm run compile
vsce publish
```

### Hotfix Process

```bash
# Create hotfix branch from tag
git checkout -b hotfix/0.1.1 v0.1.0

# Make fixes
# ... edit files ...

# Test thoroughly
npm test

# Commit and tag
git commit -am "Fix critical bug"
git tag v0.1.1

# Publish
vsce publish patch

# Merge back to main
git checkout main
git merge hotfix/0.1.1
git push origin main --tags
```

---

## Monitoring and Analytics

### Marketplace Statistics

```bash
# View extension statistics
vsce show onboard-team.onboard

# JSON output for automation
vsce show onboard-team.onboard --json
```

### Key Metrics to Track

- **Installs** - Total installations
- **Updates** - Version adoption rate
- **Ratings** - User satisfaction
- **Reviews** - User feedback
- **Uninstalls** - Churn rate

### Error Monitoring

Consider integrating:
- Application Insights
- Sentry
- Custom telemetry (with user consent)

---

## Security Considerations

### Before Publishing

- [ ] No hardcoded API keys
- [ ] No sensitive data in code
- [ ] Dependencies are up to date
- [ ] No known vulnerabilities (`npm audit`)
- [ ] Permissions are minimal
- [ ] Privacy policy is clear

### Dependency Auditing

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Review and fix manually
npm audit fix --force
```

### Code Signing

Consider signing your extension:
```bash
# Sign VSIX package
vsce package --sign
```

---

## Troubleshooting

### Common Issues

#### "Publisher not found"
```bash
# Solution: Login again
vsce login onboard-team
```

#### "Version already exists"
```bash
# Solution: Bump version
npm version patch
vsce publish
```

#### "Package size too large"
```bash
# Solution: Check .vscodeignore
# Add large files/folders to ignore list
echo "node_modules/" >> .vscodeignore
echo "src/" >> .vscodeignore
echo "*.ts" >> .vscodeignore
```

#### "Tests failing in CI"
```bash
# Solution: Use xvfb for headless testing
xvfb-run -a npm test
```

---

## Post-Deployment

### Announcement Checklist

- [ ] Update GitHub README with new version
- [ ] Post release notes on GitHub
- [ ] Announce on social media (if applicable)
- [ ] Update documentation site
- [ ] Notify users via email (if applicable)
- [ ] Update demo video (if features changed)

### User Support

- Monitor GitHub Issues for bug reports
- Respond to marketplace reviews
- Update FAQ based on common questions
- Provide migration guides for breaking changes

---

## Resources

- [VS Code Extension Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce Documentation](https://github.com/microsoft/vscode-vsce)
- [Extension Manifest Reference](https://code.visualstudio.com/api/references/extension-manifest)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

---

**Questions?** Open an issue on GitHub or consult the [Contributing Guide](CONTRIBUTING.md).
