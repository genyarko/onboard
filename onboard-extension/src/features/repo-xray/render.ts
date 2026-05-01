import * as path from 'path';
import * as fs from 'fs/promises';
import { RepoXRayResult } from './schema';

/**
 * Render the complete Repo X-Ray result as a markdown document
 * @param result The complete analysis result
 * @param workspaceRoot The workspace root path
 * @returns Path to the generated markdown file
 */
export async function renderMarkdown(result: RepoXRayResult, workspaceRoot: string): Promise<string> {
  const markdown = buildMarkdownDocument(result);
  const outputPath = path.join(workspaceRoot, 'ONBOARD_XRAY.md');
  
  await fs.writeFile(outputPath, markdown, 'utf-8');
  
  return outputPath;
}

/**
 * Build the complete markdown document
 */
function buildMarkdownDocument(result: RepoXRayResult): string {
  const sections: string[] = [];

  // Header
  sections.push(renderHeader(result));

  // Table of Contents
  sections.push(renderTableOfContents());

  // Entry Points Section
  sections.push(renderEntryPoints(result));

  // Architecture Section
  sections.push(renderArchitecture(result));

  // Critical Path Narrative
  sections.push(renderCriticalPath(result));

  // Conventions Section
  sections.push(renderConventions(result));

  // Technical Stack Section
  sections.push(renderTechnicalStack(result));

  // Weird Parts Section
  sections.push(renderWeirdParts(result));

  // Footer
  sections.push(renderFooter(result));

  return sections.join('\n\n---\n\n');
}

/**
 * Render document header
 */
function renderHeader(result: RepoXRayResult): string {
  const repoName = path.basename(result.metadata.repositoryPath);
  const analyzedDate = new Date(result.metadata.analyzedAt).toLocaleString();

  return `# 🔍 Repository X-Ray: ${repoName}

> **Comprehensive Onboarding Documentation**
> 
> Generated on: ${analyzedDate}  
> Analysis Version: ${result.metadata.analysisVersion}

This document provides a complete overview of the codebase architecture, conventions, and key insights to help you get up to speed quickly.`;
}

/**
 * Render table of contents
 */
function renderTableOfContents(): string {
  return `## 📋 Table of Contents

1. [Entry Points](#-entry-points)
2. [Architecture Overview](#-architecture-overview)
3. [Critical Path](#-critical-path)
4. [Coding Conventions](#-coding-conventions)
5. [Technical Stack](#-technical-stack)
6. [Weird Parts](#-weird-parts)`;
}

/**
 * Render entry points section
 */
function renderEntryPoints(result: RepoXRayResult): string {
  const { entryPoints } = result.entryPoints;

  const sections: string[] = [
    '## 🚪 Entry Points',
    '',
    result.entryPoints.summary,
    '',
    '### Key Entry Points',
    '',
  ];

  // Group by importance
  const grouped = {
    critical: entryPoints.filter((ep) => ep.importance === 'critical'),
    high: entryPoints.filter((ep) => ep.importance === 'high'),
    medium: entryPoints.filter((ep) => ep.importance === 'medium'),
    low: entryPoints.filter((ep) => ep.importance === 'low'),
  };

  for (const [importance, eps] of Object.entries(grouped)) {
    if (eps.length === 0) continue;

    const emoji = importance === 'critical' ? '🔴' : importance === 'high' ? '🟠' : importance === 'medium' ? '🟡' : '🟢';
    sections.push(`#### ${emoji} ${importance.charAt(0).toUpperCase() + importance.slice(1)} Priority`);
    sections.push('');

    for (const ep of eps) {
      sections.push(`**\`${ep.file}\`**`);
      sections.push(`- **Role:** ${ep.role}`);
      sections.push(`- **Description:** ${ep.description}`);
      sections.push('');
    }
  }

  return sections.join('\n');
}

/**
 * Render architecture section with Mermaid diagram
 */
function renderArchitecture(result: RepoXRayResult): string {
  const { layers, dependencyFlow, keyPatterns } = result.dependencyGraph;
  const { architectureDiagram } = result.artifacts;

  const sections: string[] = [
    '## 🏗️ Architecture Overview',
    '',
    '### Architecture Diagram',
    '',
    '```mermaid',
    architectureDiagram,
    '```',
    '',
    '### Dependency Flow',
    '',
    dependencyFlow,
    '',
    '### Architectural Layers',
    '',
  ];

  for (const layer of layers) {
    sections.push(`#### ${layer.name}`);
    sections.push('');
    sections.push(layer.description);
    sections.push('');
    sections.push('**Key Files:**');
    for (const file of layer.files.slice(0, 5)) {
      sections.push(`- \`${file}\``);
    }
    if (layer.files.length > 5) {
      sections.push(`- *...and ${layer.files.length - 5} more*`);
    }
    sections.push('');
    if (layer.dependsOn.length > 0) {
      sections.push(`**Dependencies:** ${layer.dependsOn.join(', ')}`);
      sections.push('');
    }
  }

  sections.push('### Key Architectural Patterns');
  sections.push('');
  for (const pattern of keyPatterns) {
    sections.push(`- **${pattern}**`);
  }

  return sections.join('\n');
}

/**
 * Render critical path narrative
 */
function renderCriticalPath(result: RepoXRayResult): string {
  const { criticalPathNarrative } = result.artifacts;

  return `## 🛤️ Critical Path

${criticalPathNarrative}`;
}

/**
 * Render conventions section as tables
 */
function renderConventions(result: RepoXRayResult): string {
  const { conventions } = result.artifacts;

  const sections: string[] = [
    '## 📐 Coding Conventions',
    '',
    'Follow these conventions to maintain consistency with the existing codebase.',
    '',
  ];

  // Group conventions by category
  const grouped = conventions.reduce((acc, conv) => {
    if (!acc[conv.category]) {
      acc[conv.category] = [];
    }
    acc[conv.category].push(conv);
    return acc;
  }, {} as Record<string, typeof conventions>);

  for (const [category, convs] of Object.entries(grouped)) {
    sections.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`);
    sections.push('');
    sections.push('| Rule | Examples |');
    sections.push('|------|----------|');

    for (const conv of convs) {
      const examples = conv.examples.map((ex) => `\`${ex}\``).join('<br>');
      sections.push(`| ${conv.rule} | ${examples} |`);
    }

    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Render technical stack section
 */
function renderTechnicalStack(result: RepoXRayResult): string {
  const { technicalStack } = result.artifacts;

  const sections: string[] = [
    '## 🛠️ Technical Stack',
    '',
    'Key technologies, frameworks, and libraries used in this project:',
    '',
  ];

  for (const tech of technicalStack) {
    sections.push(`- **${tech}**`);
  }

  return sections.join('\n');
}

/**
 * Render weird parts section with callout boxes
 */
function renderWeirdParts(result: RepoXRayResult): string {
  const { weirdParts, summary } = result.weirdParts;

  const sections: string[] = [
    '## ⚠️ Weird Parts',
    '',
    summary,
    '',
  ];

  if (weirdParts.length === 0) {
    sections.push('> ✅ No significant anomalies detected. The codebase follows consistent patterns throughout.');
    return sections.join('\n');
  }

  sections.push('The following parts of the codebase deviate from established conventions or patterns:');
  sections.push('');

  // Group by severity
  const grouped = {
    high: weirdParts.filter((wp) => wp.severity === 'high'),
    medium: weirdParts.filter((wp) => wp.severity === 'medium'),
    low: weirdParts.filter((wp) => wp.severity === 'low'),
  };

  for (const [severity, wps] of Object.entries(grouped)) {
    if (wps.length === 0) continue;

    const emoji = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
    sections.push(`### ${emoji} ${severity.charAt(0).toUpperCase() + severity.slice(1)} Severity`);
    sections.push('');

    for (const wp of wps) {
      sections.push(`> **📍 \`${wp.file}\`${wp.lineRange ? ` (lines ${wp.lineRange})` : ''}**`);
      sections.push('>');
      sections.push(`> **What's weird:** ${wp.description}`);
      sections.push('>');
      sections.push(`> **Why it might exist:** ${wp.hypothesis}`);
      if (wp.contradicts) {
        sections.push('>');
        sections.push(`> **Contradicts:** ${wp.contradicts}`);
      }
      sections.push('');
    }
  }

  return sections.join('\n');
}

/**
 * Render footer
 */
function renderFooter(result: RepoXRayResult): string {
  return `## 📚 Next Steps

Now that you understand the codebase structure:

1. **Explore Entry Points**: Start by examining the critical entry points listed above
2. **Follow the Critical Path**: Trace through a typical request flow to understand the system
3. **Review Conventions**: Familiarize yourself with the coding standards before making changes
4. **Investigate Weird Parts**: Understand the context behind unusual code patterns
5. **Set Up Your Environment**: Refer to the README.md for setup instructions

---

*This document was automatically generated by Onboard X-Ray. For questions or issues, please refer to the project documentation.*`;
}
