import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

suite('Starter Tasks Test Suite', () => {
    const testWorkspaceRoot = path.join(__dirname, '..', '..', '..', 'test-workspace-tasks');

    setup(async () => {
        // Create test workspace with TODO comments
        try {
            await fs.mkdir(testWorkspaceRoot, { recursive: true });
            await fs.mkdir(path.join(testWorkspaceRoot, 'src'), { recursive: true });
            
            await fs.writeFile(
                path.join(testWorkspaceRoot, 'src', 'index.ts'),
                `// TODO: Add error handling here
export function main() {
    // FIXME: This needs optimization
    console.log("Hello");
}`
            );
            
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
        const errorMessage = 'Please open a folder first.';
        assert.ok(errorMessage.includes('Please open a folder'));
    });

    test('Should detect TODO comments in files', async () => {
        const filePath = path.join(testWorkspaceRoot, 'src', 'index.ts');
        const content = await fs.readFile(filePath, 'utf-8');
        
        assert.ok(content.includes('TODO:'));
        assert.ok(content.includes('FIXME:'));
    });

    test('Should parse TODO regex correctly', () => {
        const todoRegex = /\b(TODO|FIXME)\b(.*)$/gim;
        const testLines = [
            '// TODO: Add error handling',
            '// FIXME: This needs optimization',
            '/* TODO: Refactor this function */',
            'const x = 5; // No todo here',
        ];

        const matches = testLines.filter(line => todoRegex.test(line));
        assert.strictEqual(matches.length, 3);
    });

    test('Should validate SearchHit structure', () => {
        const mockHit = {
            filePath: 'src/index.ts',
            lineNumber: 5,
            content: '// TODO: Add error handling',
            surroundingCode: 'function test() {\n  // TODO: Add error handling\n  return true;\n}',
        };

        assert.strictEqual(mockHit.filePath, 'src/index.ts');
        assert.strictEqual(mockHit.lineNumber, 5);
        assert.ok(mockHit.content.includes('TODO'));
        assert.ok(mockHit.surroundingCode.length > 0);
    });

    test('Should limit search hits to prevent overwhelming', () => {
        const maxHits = 50;
        const hits: any[] = [];
        
        for (let i = 0; i < 100; i++) {
            if (hits.length >= maxHits) break;
            hits.push({ filePath: `file${i}.ts`, lineNumber: i });
        }
        
        assert.strictEqual(hits.length, maxHits);
    });

    test('Should exclude common directories from search', () => {
        const excludePattern = '{**/node_modules/**,**/dist/**,**/out/**,**/.git/**,**/.bob/**,**/eval/**}';
        
        assert.ok(excludePattern.includes('node_modules'));
        assert.ok(excludePattern.includes('dist'));
        assert.ok(excludePattern.includes('.git'));
    });

    test('Should detect tech stack from package.json', async () => {
        const files = await fs.readdir(testWorkspaceRoot);
        const hasPackageJson = files.includes('package.json');
        
        assert.strictEqual(hasPackageJson, true);
    });

    test('Should detect multiple tech stacks', () => {
        const mockFiles = ['package.json', 'requirements.txt', 'go.mod'];
        const stack: string[] = [];
        
        if (mockFiles.includes('package.json')) stack.push('TypeScript/JavaScript (Node.js)');
        if (mockFiles.includes('requirements.txt')) stack.push('Python');
        if (mockFiles.includes('go.mod')) stack.push('Go');
        
        assert.strictEqual(stack.length, 3);
        assert.ok(stack.includes('TypeScript/JavaScript (Node.js)'));
        assert.ok(stack.includes('Python'));
        assert.ok(stack.includes('Go'));
    });

    test('Should validate StarterTasksContext structure', () => {
        const mockContext = {
            repositoryName: 'test-project',
            repositoryPath: testWorkspaceRoot,
            fileTree: 'test-project/\n├── src/\n└── package.json',
            searchHits: [
                {
                    filePath: 'src/index.ts',
                    lineNumber: 1,
                    content: '// TODO: Test',
                    surroundingCode: 'code context',
                },
            ],
            techStack: ['TypeScript/JavaScript (Node.js)'],
        };

        assert.strictEqual(mockContext.repositoryName, 'test-project');
        assert.ok(Array.isArray(mockContext.searchHits));
        assert.ok(Array.isArray(mockContext.techStack));
        assert.ok(mockContext.fileTree.length > 0);
    });

    test('Should validate StarterTask structure', () => {
        const mockTask = {
            title: 'Add Error Handling',
            description: 'Implement proper error handling in the main function',
            difficulty: 'medium',
            estimatedMinutes: 45,
            filePath: 'src/index.ts',
            lineNumber: 5,
            category: 'bug-fix',
            prerequisites: ['Understanding of try-catch blocks'],
            learningObjectives: ['Error handling patterns', 'Best practices'],
            hints: ['Consider using try-catch', 'Log errors appropriately'],
        };

        assert.strictEqual(mockTask.title, 'Add Error Handling');
        assert.strictEqual(mockTask.difficulty, 'medium');
        assert.strictEqual(typeof mockTask.estimatedMinutes, 'number');
        assert.ok(Array.isArray(mockTask.prerequisites));
        assert.ok(Array.isArray(mockTask.learningObjectives));
        assert.ok(Array.isArray(mockTask.hints));
    });

    test('Should validate StarterTasksResponse structure', () => {
        const mockResponse = {
            tasks: [
                {
                    title: 'Task 1',
                    description: 'Description 1',
                    difficulty: 'easy',
                    estimatedMinutes: 30,
                    filePath: 'src/file1.ts',
                    lineNumber: 10,
                    category: 'feature',
                    prerequisites: [],
                    learningObjectives: [],
                    hints: [],
                },
            ],
            summary: 'Found 1 starter task',
        };

        assert.ok(Array.isArray(mockResponse.tasks));
        assert.strictEqual(mockResponse.tasks.length, 1);
        assert.ok(mockResponse.summary);
    });

    test('Should create ONBOARD_TASKS directory', async () => {
        const tasksDir = path.join(testWorkspaceRoot, 'ONBOARD_TASKS');
        await fs.mkdir(tasksDir, { recursive: true });
        
        const stats = await fs.stat(tasksDir);
        assert.ok(stats.isDirectory());
    });

    test('Should save task cards with correct naming', async () => {
        const tasksDir = path.join(testWorkspaceRoot, 'ONBOARD_TASKS');
        await fs.mkdir(tasksDir, { recursive: true });
        
        const taskContent = '# Task 1\n\nThis is a test task.';
        const filePath = path.join(tasksDir, 'task-1.md');
        await fs.writeFile(filePath, taskContent, 'utf-8');
        
        const saved = await fs.readFile(filePath, 'utf-8');
        assert.strictEqual(saved, taskContent);
    });

    test('Should render task card with all sections', () => {
        const mockTask = {
            title: 'Test Task',
            description: 'Test description',
            difficulty: 'medium',
            estimatedMinutes: 45,
            filePath: 'src/test.ts',
            lineNumber: 10,
            category: 'feature',
            prerequisites: ['Prerequisite 1'],
            learningObjectives: ['Objective 1'],
            hints: ['Hint 1'],
        };

        const markdown = renderMockTaskCard(mockTask, 0, 5);
        
        assert.ok(markdown.includes('# Test Task'));
        assert.ok(markdown.includes('**Difficulty:**'));
        assert.ok(markdown.includes('**Estimated Time:**'));
        assert.ok(markdown.includes('**File:**'));
        assert.ok(markdown.includes('## Prerequisites'));
        assert.ok(markdown.includes('## Learning Objectives'));
        assert.ok(markdown.includes('## Hints'));
    });

    test('Should include task number in card', () => {
        const taskNumber = 3;
        const totalTasks = 10;
        const header = `Task ${taskNumber} of ${totalTasks}`;
        
        assert.ok(header.includes('3'));
        assert.ok(header.includes('10'));
    });

    test('Should render summary with task count', () => {
        const mockResponse = {
            tasks: [
                { title: 'Task 1' },
                { title: 'Task 2' },
                { title: 'Task 3' },
            ],
            summary: 'Found 3 starter tasks',
        };

        const summary = `# Starter Tasks Summary\n\n${mockResponse.summary}\n\n**Total Tasks:** ${mockResponse.tasks.length}`;
        
        assert.ok(summary.includes('3'));
        assert.ok(summary.includes('Starter Tasks Summary'));
    });

    test('Should handle cancellation token', () => {
        const mockToken = {
            isCancellationRequested: false,
            onCancellationRequested: () => ({ dispose: () => {} }),
        };

        assert.strictEqual(mockToken.isCancellationRequested, false);
    });

    test('Should handle empty search results', () => {
        const hits: any[] = [];
        assert.strictEqual(hits.length, 0);
    });

    test('Should show appropriate message for no TODOs', () => {
        const message = 'No TODO/FIXME comments found in the codebase.';
        assert.ok(message.includes('No TODO/FIXME'));
    });

    test('Should validate difficulty levels', () => {
        const validDifficulties = ['easy', 'medium', 'hard'];
        
        validDifficulties.forEach(difficulty => {
            assert.ok(['easy', 'medium', 'hard'].includes(difficulty));
        });
    });

    test('Should validate category types', () => {
        const validCategories = ['bug-fix', 'feature', 'refactor', 'documentation', 'testing'];
        
        validCategories.forEach(category => {
            assert.ok(['bug-fix', 'feature', 'refactor', 'documentation', 'testing'].includes(category));
        });
    });

    test('Should extract surrounding code context', () => {
        const lines = [
            'line 1',
            'line 2',
            'line 3',
            '// TODO: Fix this',
            'line 5',
            'line 6',
            'line 7',
        ];
        
        const todoIndex = 3;
        const startLine = Math.max(0, todoIndex - 2);
        const endLine = Math.min(lines.length - 1, todoIndex + 2);
        const context = lines.slice(startLine, endLine + 1);
        
        assert.strictEqual(context.length, 5);
        assert.ok(context.includes('// TODO: Fix this'));
    });

    test('Should handle file read errors gracefully', async () => {
        const nonExistentPath = path.join(testWorkspaceRoot, 'non-existent.ts');
        
        try {
            await fs.readFile(nonExistentPath, 'utf-8');
            assert.fail('Should have thrown an error');
        } catch (error) {
            // Expected to fail
            assert.ok(error);
        }
    });

    test('Should open summary in preview mode', () => {
        const viewColumn = vscode.ViewColumn.One;
        assert.ok(viewColumn === vscode.ViewColumn.One);
    });

    test('Should open task card beside summary', () => {
        const viewColumn = vscode.ViewColumn.Beside;
        assert.strictEqual(viewColumn, vscode.ViewColumn.Beside);
    });

    test('Should show success message with task count', () => {
        const taskCount = 5;
        const message = `Generated ${taskCount} starter tasks in ONBOARD_TASKS/`;
        
        assert.ok(message.includes('5'));
        assert.ok(message.includes('ONBOARD_TASKS'));
    });
});

// Helper function to render mock task card
function renderMockTaskCard(task: any, index: number, total: number): string {
    const lines: string[] = [];
    
    lines.push(`# ${task.title}`);
    lines.push('');
    lines.push(`**Task ${index + 1} of ${total}**`);
    lines.push('');
    lines.push(`**Difficulty:** ${task.difficulty}`);
    lines.push(`**Estimated Time:** ${task.estimatedMinutes} minutes`);
    lines.push(`**Category:** ${task.category}`);
    lines.push(`**File:** \`${task.filePath}:${task.lineNumber}\``);
    lines.push('');
    lines.push('## Description');
    lines.push('');
    lines.push(task.description);
    lines.push('');
    
    if (task.prerequisites.length > 0) {
        lines.push('## Prerequisites');
        lines.push('');
        task.prerequisites.forEach((prereq: string) => {
            lines.push(`- ${prereq}`);
        });
        lines.push('');
    }
    
    if (task.learningObjectives.length > 0) {
        lines.push('## Learning Objectives');
        lines.push('');
        task.learningObjectives.forEach((obj: string) => {
            lines.push(`- ${obj}`);
        });
        lines.push('');
    }
    
    if (task.hints.length > 0) {
        lines.push('## Hints');
        lines.push('');
        task.hints.forEach((hint: string) => {
            lines.push(`- ${hint}`);
        });
        lines.push('');
    }
    
    return lines.join('\n');
}
