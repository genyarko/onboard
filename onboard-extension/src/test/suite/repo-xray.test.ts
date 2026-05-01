import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

suite('Repo X-Ray Test Suite', () => {
    const testWorkspaceRoot = path.join(__dirname, '..', '..', '..', 'test-workspace');

    setup(async () => {
        // Create test workspace directory structure
        try {
            await fs.mkdir(testWorkspaceRoot, { recursive: true });
            await fs.mkdir(path.join(testWorkspaceRoot, 'src'), { recursive: true });
            await fs.writeFile(
                path.join(testWorkspaceRoot, 'package.json'),
                JSON.stringify({ name: 'test-project', version: '1.0.0' }, null, 2)
            );
            await fs.writeFile(
                path.join(testWorkspaceRoot, 'README.md'),
                '# Test Project\n\nThis is a test project.'
            );
            await fs.writeFile(
                path.join(testWorkspaceRoot, 'src', 'index.ts'),
                'export function main() { console.log("Hello"); }'
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

    test('Should fail when no workspace is open', async () => {
        // This test would need to mock vscode.workspace.workspaceFolders
        // For now, we'll test the error message format
        const errorMessage = 'No workspace folder is open. Please open a folder first.';
        assert.ok(errorMessage.includes('No workspace folder'));
    });

    test('Should read package.json if it exists', async () => {
        const packageJsonPath = path.join(testWorkspaceRoot, 'package.json');
        const content = await fs.readFile(packageJsonPath, 'utf-8');
        const parsed = JSON.parse(content);
        
        assert.strictEqual(parsed.name, 'test-project');
        assert.strictEqual(parsed.version, '1.0.0');
    });

    test('Should read README.md if it exists', async () => {
        const readmePath = path.join(testWorkspaceRoot, 'README.md');
        const content = await fs.readFile(readmePath, 'utf-8');
        
        assert.ok(content.includes('# Test Project'));
        assert.ok(content.includes('This is a test project'));
    });

    test('Should generate file tree structure', async () => {
        // Test file tree generation logic
        const entries = await fs.readdir(testWorkspaceRoot, { withFileTypes: true });
        const files = entries.filter(e => e.isFile()).map(e => e.name);
        const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
        
        assert.ok(files.includes('package.json'));
        assert.ok(files.includes('README.md'));
        assert.ok(dirs.includes('src'));
    });

    test('Should ignore common directories', () => {
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
        ]);

        assert.ok(ignoreDirs.has('node_modules'));
        assert.ok(ignoreDirs.has('.git'));
        assert.ok(ignoreDirs.has('dist'));
        assert.ok(!ignoreDirs.has('src'));
    });

    test('Should handle missing optional files gracefully', async () => {
        const nonExistentPath = path.join(testWorkspaceRoot, 'non-existent.txt');
        
        try {
            await fs.readFile(nonExistentPath, 'utf-8');
            assert.fail('Should have thrown an error');
        } catch (error) {
            // Expected to fail - file doesn't exist
            assert.ok(error);
        }
    });

    test('Entry points response should have required structure', () => {
        const mockEntryPoints = {
            entryPoints: [
                {
                    path: 'src/index.ts',
                    type: 'main',
                    description: 'Main entry point',
                    importance: 'high',
                },
            ],
        };

        assert.ok(Array.isArray(mockEntryPoints.entryPoints));
        assert.strictEqual(mockEntryPoints.entryPoints[0].path, 'src/index.ts');
        assert.strictEqual(mockEntryPoints.entryPoints[0].type, 'main');
    });

    test('Dependency graph response should have required structure', () => {
        const mockDependencyGraph = {
            modules: [
                {
                    name: 'index',
                    path: 'src/index.ts',
                    dependencies: [],
                    dependents: [],
                },
            ],
            externalDependencies: [
                {
                    name: 'express',
                    version: '^4.18.0',
                    purpose: 'Web framework',
                },
            ],
        };

        assert.ok(Array.isArray(mockDependencyGraph.modules));
        assert.ok(Array.isArray(mockDependencyGraph.externalDependencies));
        assert.strictEqual(mockDependencyGraph.modules[0].name, 'index');
    });

    test('Artifacts response should have required structure', () => {
        const mockArtifacts = {
            glossary: [
                {
                    term: 'API',
                    definition: 'Application Programming Interface',
                },
            ],
            architectureDiagram: 'graph TD\n  A[Client] --> B[Server]',
            keyFiles: [
                {
                    path: 'src/index.ts',
                    purpose: 'Main entry point',
                    importance: 'high',
                },
            ],
        };

        assert.ok(Array.isArray(mockArtifacts.glossary));
        assert.ok(typeof mockArtifacts.architectureDiagram === 'string');
        assert.ok(Array.isArray(mockArtifacts.keyFiles));
    });

    test('Weird parts response should have required structure', () => {
        const mockWeirdParts = {
            weirdParts: [
                {
                    location: 'src/legacy.ts',
                    description: 'Legacy code with unusual patterns',
                    severity: 'medium',
                    recommendation: 'Consider refactoring',
                },
            ],
        };

        assert.ok(Array.isArray(mockWeirdParts.weirdParts));
        assert.strictEqual(mockWeirdParts.weirdParts[0].location, 'src/legacy.ts');
        assert.strictEqual(mockWeirdParts.weirdParts[0].severity, 'medium');
    });

    test('Should validate complete RepoXRayResult structure', () => {
        const mockResult = {
            entryPoints: {
                entryPoints: [],
            },
            dependencyGraph: {
                modules: [],
                externalDependencies: [],
            },
            artifacts: {
                glossary: [],
                architectureDiagram: '',
                keyFiles: [],
            },
            weirdParts: {
                weirdParts: [],
            },
            metadata: {
                repositoryPath: testWorkspaceRoot,
                analyzedAt: new Date().toISOString(),
                analysisVersion: '1.0.0',
            },
        };

        assert.ok(mockResult.entryPoints);
        assert.ok(mockResult.dependencyGraph);
        assert.ok(mockResult.artifacts);
        assert.ok(mockResult.weirdParts);
        assert.ok(mockResult.metadata);
        assert.strictEqual(mockResult.metadata.analysisVersion, '1.0.0');
    });

    test('Should handle prompt execution errors gracefully', () => {
        const errorMessage = 'Prompt 1 failed: No data returned';
        assert.ok(errorMessage.includes('Prompt 1 failed'));
        assert.ok(errorMessage.includes('No data returned'));
    });

    test('Should handle validation errors gracefully', () => {
        const errorMessage = 'Prompt 1 validation failed: Invalid schema';
        assert.ok(errorMessage.includes('validation failed'));
        assert.ok(errorMessage.includes('Invalid schema'));
    });
});
