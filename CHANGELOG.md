# Changelog

All notable changes to the Onboard VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Inline code annotations
- Progress tracking for Day-N Plan
- Task completion validation
- Team onboarding templates
- Multi-repository support
- Custom learning paths
- Integration with issue trackers
- Onboarding analytics

## [0.1.0] - 2026-05-01

### Added

#### Core Features
- **Repo X-Ray** - Repository architecture analysis
  - Generates architecture diagrams (Mermaid format)
  - Identifies system layers and dependencies
  - Creates conventions cheat sheet
  - Detects "weird parts" with explanations
  - Outputs comprehensive markdown document

- **Why Is This Here** - Code context provider
  - Right-click any line for business context
  - Synthesizes git history, PRs, and issues
  - Explains why code exists, not just what it does
  - Caches results for performance
  - Graceful fallback when git history unavailable

- **Day-N Plan** - Personalized learning paths
  - 5-day onboarding plans
  - Configurable by role, seniority, and focus area
  - Interactive tree view in sidebar
  - Links to files and tasks
  - Progressive learning structure

- **Starter Tasks** - Beginner-friendly task finder
  - Scans for TODO/FIXME comments
  - Identifies missing test coverage
  - Finds undocumented functions
  - Generates task cards with hints
  - Difficulty ratings and time estimates

#### Infrastructure
- IBM Bob API client with structured responses
- Zod schema validation for all outputs
- Comprehensive error handling
- TypeScript strict mode
- ESLint and Prettier configuration

#### Testing
- Evaluation harness with two metrics:
  - Faithfulness evaluation (Why-Is-This-Here accuracy)
  - Completeness evaluation (Repo X-Ray detection rate)
- Ground truth data for FastAPI repository
- CSV output for results
- Unit tests for core functionality
- Integration tests for features
- Mock Bob client for testing

#### Documentation
- Comprehensive README with problem statement
- Extension user guide with examples
- API documentation for developers
- Contributing guidelines
- Evaluation guide
- Testing documentation

#### Developer Experience
- VS Code extension scaffold
- Hot reload during development
- Debug configuration
- Git utilities for history analysis
- Prompt templates and utilities

### Technical Details

#### Dependencies
- `zod` ^3.22.4 - Schema validation
- `@types/vscode` ^1.85.0 - VS Code API types
- TypeScript 5.3+ - Language and compiler

#### VS Code Integration
- Command palette commands
- Context menu integration
- Tree view provider for Day-N Plan
- Hover provider for Why-Is-This-Here
- Markdown preview for outputs
- Native VS Code primitives (no custom webviews)

#### Performance
- Repo X-Ray: 30-60 seconds (repository-dependent)
- Why-Is-This-Here: 3-5 seconds (cached after first request)
- Day-N Plan: 10-15 seconds
- Starter Tasks: 15-20 seconds

#### Security
- API keys from environment variables only
- No logging of sensitive data
- HTTPS for all API communication
- Local git history processing
- No telemetry or tracking

### Known Issues
- Large repositories (>10,000 files) may timeout on Repo X-Ray
- GitHub API rate limiting may affect Why-Is-This-Here for repos with many PRs
- Git history required for Why-Is-This-Here (graceful degradation implemented)

### Breaking Changes
None - initial release

---

## Version History

### [0.1.0] - 2026-05-01
- Initial release for IBM Bob Dev Day Hackathon
- Four core features implemented
- Evaluation harness with ground truth data
- Comprehensive documentation

---

## Upgrade Guide

### From Pre-release to 0.1.0

This is the first stable release. If you were using a pre-release version:

1. **Update environment variables:**
   ```bash
   # Ensure BOB_API_KEY is set
   export BOB_API_KEY="your-key"
   ```

2. **Reinstall dependencies:**
   ```bash
   cd onboard-extension
   npm install
   npm run compile
   ```

3. **Clear cache (optional):**
   - Run command: `Onboard: Clear Why-Is-This-Here Cache`

4. **Test features:**
   - Run Repo X-Ray on a test repository
   - Verify all commands appear in Command Palette

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Reporting bugs
- Suggesting features
- Submitting pull requests
- Development workflow

---

## Support

- **Issues:** [GitHub Issues](https://github.com/your-org/onboard/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-org/onboard/discussions)
- **Documentation:** [README.md](README.md) | [API.md](API.md)

---

## License

MIT License - See [LICENSE](LICENSE) for details

---

**Note:** This changelog follows [Keep a Changelog](https://keepachangelog.com/) principles and [Semantic Versioning](https://semver.org/).
