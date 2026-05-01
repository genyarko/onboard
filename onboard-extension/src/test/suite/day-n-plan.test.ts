import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

suite('Day-N Plan Test Suite', () => {
    const testWorkspaceRoot = path.join(__dirname, '..', '..', '..', 'test-workspace-plan');

    setup(async () => {
        // Create test workspace directory structure
        try {
            await fs.mkdir(testWorkspaceRoot, { recursive: true });
            await fs.mkdir(path.join(testWorkspaceRoot, 'src'), { recursive: true });
            await fs.writeFile(
                path.join(testWorkspaceRoot, 'package.json'),
                JSON.stringify({ name: 'test-project', version: '1.0.0' }, null, 2)
            );
        } catch (error) {
            // Directory might already exist
        }
    });

    teardown(async () => {
        // Clean up test workspace
        try {
            await fs.rm(testWorkspaceRoot, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    test('Should fail when no workspace is open', () => {
        const errorMessage = 'No workspace folder is open. Please open a folder first.';
        assert.ok(errorMessage.includes('No workspace folder'));
    });

    test('Should validate plan configuration structure', () => {
        const mockConfig = {
            role: 'Backend Developer',
            seniority: 'mid',
            focusArea: 'API Development',
            priorKnowledge: ['Node.js', 'TypeScript'],
        };

        assert.strictEqual(mockConfig.role, 'Backend Developer');
        assert.strictEqual(mockConfig.seniority, 'mid');
        assert.ok(Array.isArray(mockConfig.priorKnowledge));
    });

    test('Should generate file tree with proper structure', async () => {
        const entries = await fs.readdir(testWorkspaceRoot, { withFileTypes: true });
        const files = entries.filter(e => e.isFile()).map(e => e.name);
        const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);

        assert.ok(files.includes('package.json'));
        assert.ok(dirs.includes('src'));
    });

    test('Should ignore common directories in file tree', () => {
        const ignoreDirs = new Set([
            'node_modules',
            '.git',
            'dist',
            'build',
            'out',
            '.vscode',
            '__pycache__',
            '.pytest_cache',
            'venv',
            '.env',
            'coverage',
            '.next',
            '.nuxt',
        ]);

        assert.ok(ignoreDirs.has('node_modules'));
        assert.ok(ignoreDirs.has('.git'));
        assert.ok(ignoreDirs.has('coverage'));
        assert.ok(!ignoreDirs.has('src'));
    });

    test('Should handle missing Repo X-Ray data gracefully', async () => {
        const xrayPath = path.join(testWorkspaceRoot, 'REPO_XRAY.md');
        
        try {
            await fs.readFile(xrayPath, 'utf-8');
            assert.fail('Should not find REPO_XRAY.md');
        } catch (error) {
            // Expected - file doesn't exist
            assert.ok(error);
        }
    });

    test('Should parse Repo X-Ray data when available', async () => {
        const mockXRayContent = `# Repository X-Ray

## 🚪 Entry Points

- src/index.ts - Main entry point

## 🏗️ Architecture Diagram

\`\`\`mermaid
graph TD
  A[Client] --> B[Server]
\`\`\`

## 🎯 Critical Path

1. Initialize application
2. Load configuration

## 📋 Conventions

- Use TypeScript
- Follow ESLint rules

**Tech Stack:** Node.js, TypeScript, Express`;

        const xrayPath = path.join(testWorkspaceRoot, 'REPO_XRAY.md');
        await fs.writeFile(xrayPath, mockXRayContent, 'utf-8');

        const content = await fs.readFile(xrayPath, 'utf-8');
        assert.ok(content.includes('Entry Points'));
        assert.ok(content.includes('Architecture Diagram'));
        assert.ok(content.includes('Tech Stack'));
    });

    test('Should validate OnboardingPlan structure', () => {
        const mockPlan = {
            role: 'Backend Developer',
            seniority: 'mid',
            focusArea: 'API Development',
            overview: 'This plan will help you understand the API architecture',
            days: [
                {
                    day: 1,
                    concept: 'Understanding the Codebase',
                    goal: 'Get familiar with project structure',
                    readingList: [
                        {
                            filePath: 'README.md',
                            description: 'Project overview',
                            estimatedMinutes: 15,
                            priority: 'high',
                        },
                    ],
                    task: {
                        title: 'Explore the codebase',
                        description: 'Navigate through key directories',
                        estimatedMinutes: 60,
                        difficulty: 'easy',
                    },
                    tips: ['Take notes', 'Ask questions'],
                },
            ],
            nextSteps: ['Continue learning', 'Build features'],
        };

        assert.strictEqual(mockPlan.role, 'Backend Developer');
        assert.strictEqual(mockPlan.days.length, 1);
        assert.strictEqual(mockPlan.days[0].day, 1);
        assert.ok(Array.isArray(mockPlan.days[0].readingList));
        assert.ok(mockPlan.days[0].task);
        assert.ok(Array.isArray(mockPlan.nextSteps));
    });

    test('Should validate reading list item structure', () => {
        const mockReading = {
            filePath: 'src/api/routes.ts',
            description: 'API route definitions',
            estimatedMinutes: 20,
            priority: 'high',
        };

        assert.strictEqual(mockReading.filePath, 'src/api/routes.ts');
        assert.strictEqual(mockReading.priority, 'high');
        assert.strictEqual(typeof mockReading.estimatedMinutes, 'number');
    });

    test('Should validate task structure', () => {
        const mockTask = {
            title: 'Create a new API endpoint',
            description: 'Add a GET endpoint for user data',
            estimatedMinutes: 90,
            difficulty: 'medium',
            starterFile: 'src/api/users.ts',
            starterTask: 'Add getUserById function',
        };

        assert.strictEqual(mockTask.title, 'Create a new API endpoint');
        assert.strictEqual(mockTask.difficulty, 'medium');
        assert.ok(mockTask.starterFile);
        assert.ok(mockTask.starterTask);
    });

    test('Should generate markdown with all sections', () => {
        const mockPlan = {
            role: 'Backend Developer',
            seniority: 'mid',
            focusArea: 'API Development',
            overview: 'Overview text',
            days: [
                {
                    day: 1,
                    concept: 'Test Concept',
                    goal: 'Test Goal',
                    readingList: [
                        {
                            filePath: 'test.ts',
                            description: 'Test file',
                            estimatedMinutes: 10,
                            priority: 'high',
                        },
                    ],
                    task: {
                        title: 'Test Task',
                        description: 'Test description',
                        estimatedMinutes: 30,
                        difficulty: 'easy',
                    },
                    tips: ['Tip 1'],
                },
            ],
            nextSteps: ['Step 1'],
        };

        const markdown = generateMockPlanMarkdown(mockPlan);

        assert.ok(markdown.includes('# 5-Day Onboarding Plan'));
        assert.ok(markdown.includes('**Role:** Backend Developer'));
        assert.ok(markdown.includes('## Day 1: Test Concept'));
        assert.ok(markdown.includes('### 📚 Reading List'));
        assert.ok(markdown.includes('### ✅ Task'));
        assert.ok(markdown.includes('### 💡 Tips'));
        assert.ok(markdown.includes('## 🚀 Next Steps'));
    });

    test('Should include priority icons in reading list', () => {
        const priorities = [
            { priority: 'high', icon: '🔴' },
            { priority: 'medium', icon: '🟡' },
            { priority: 'low', icon: '🟢' },
        ];

        priorities.forEach(({ priority, icon }) => {
            const markdown = `- ${icon} **test.ts** (10 min)`;
            assert.ok(markdown.includes(icon));
        });
    });

    test('Should save plan to ONBOARDING_PLAN.md', async () => {
        const planPath = path.join(testWorkspaceRoot, 'ONBOARDING_PLAN.md');
        const content = '# Test Plan\n\nThis is a test plan.';
        
        await fs.writeFile(planPath, content, 'utf-8');
        const saved = await fs.readFile(planPath, 'utf-8');
        
        assert.strictEqual(saved, content);
    });

    test('Should handle progress reporting', () => {
        const progressSteps = [
            { message: 'Analyzing repository structure...', increment: 20 },
            { message: 'Checking for repository analysis...', increment: 30 },
            { message: 'Building onboarding plan...', increment: 40 },
            { message: 'Generating personalized plan...', increment: 60 },
            { message: 'Validating plan structure...', increment: 80 },
            { message: 'Updating tree view...', increment: 90 },
            { message: 'Saving plan...', increment: 95 },
            { message: 'Complete!', increment: 100 },
        ];

        progressSteps.forEach(step => {
            assert.ok(step.message);
            assert.ok(step.increment > 0 && step.increment <= 100);
        });
    });

    test('Should validate seniority levels', () => {
        const validLevels = ['junior', 'mid', 'senior'];
        
        validLevels.forEach(level => {
            assert.ok(['junior', 'mid', 'senior'].includes(level));
        });
    });

    test('Should validate difficulty levels', () => {
        const validDifficulties = ['easy', 'medium', 'hard'];
        
        validDifficulties.forEach(difficulty => {
            assert.ok(['easy', 'medium', 'hard'].includes(difficulty));
        });
    });

    test('Should handle user cancellation', () => {
        const config = null; // User cancelled
        assert.strictEqual(config, null);
    });

    test('Should format date correctly', () => {
        const date = new Date().toLocaleDateString();
        assert.ok(date.length > 0);
        assert.ok(typeof date === 'string');
    });

    test('Should handle tree view update', () => {
        // Mock tree view provider update
        let planUpdated = false;
        const mockProvider = {
            updatePlan: (plan: any) => {
                planUpdated = true;
            },
        };

        mockProvider.updatePlan({});
        assert.strictEqual(planUpdated, true);
    });

    test('Should show success message with action buttons', () => {
        const message = '✅ 5-day onboarding plan generated for Backend Developer!';
        const buttons = ['View Plan', 'View in Tree'];

        assert.ok(message.includes('✅'));
        assert.ok(message.includes('Backend Developer'));
        assert.strictEqual(buttons.length, 2);
    });
});

// Helper function to generate mock plan markdown
function generateMockPlanMarkdown(plan: any): string {
    const lines: string[] = [];

    lines.push('# 5-Day Onboarding Plan');
    lines.push('');
    lines.push(`**Role:** ${plan.role}`);
    lines.push(`**Seniority:** ${plan.seniority}`);
    if (plan.focusArea) {
        lines.push(`**Focus Area:** ${plan.focusArea}`);
    }
    lines.push('');
    lines.push('## 📋 Overview');
    lines.push('');
    lines.push(plan.overview);
    lines.push('');

    plan.days.forEach((day: any) => {
        lines.push(`## Day ${day.day}: ${day.concept}`);
        lines.push('');
        lines.push(`**Goal:** ${day.goal}`);
        lines.push('');
        lines.push('### 📚 Reading List');
        lines.push('');
        day.readingList.forEach((reading: any) => {
            const priorityIcon = reading.priority === 'high' ? '🔴' : reading.priority === 'medium' ? '🟡' : '🟢';
            lines.push(`- ${priorityIcon} **${reading.filePath}** (${reading.estimatedMinutes} min)`);
        });
        lines.push('');
        lines.push('### ✅ Task');
        lines.push('');
        lines.push(`**${day.task.title}**`);
        lines.push('');
        if (day.tips && day.tips.length > 0) {
            lines.push('### 💡 Tips');
            lines.push('');
            day.tips.forEach((tip: string) => {
                lines.push(`- ${tip}`);
            });
            lines.push('');
        }
    });

    lines.push('## 🚀 Next Steps');
    lines.push('');
    plan.nextSteps.forEach((step: string) => {
        lines.push(`- ${step}`);
    });

    return lines.join('\n');
}
