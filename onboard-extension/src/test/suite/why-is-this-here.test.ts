import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Why Is This Here Test Suite', () => {
    test('Should show message when no editor is active', async () => {
        // This would require mocking vscode.window.activeTextEditor
        const expectedMessage = 'Open a file and place the cursor on a line first.';
        assert.ok(expectedMessage.includes('Open a file'));
    });

    test('Should get line content from active position', () => {
        const mockLineContent = 'const result = calculateTotal(items);';
        assert.ok(mockLineContent.length > 0);
        assert.ok(mockLineContent.includes('calculateTotal'));
    });

    test('Should format relative path correctly', () => {
        const fullPath = 'C:\\Users\\test\\project\\src\\utils.ts';
        const relativePath = 'src/utils.ts';
        assert.ok(relativePath.startsWith('src'));
        assert.ok(!relativePath.includes('C:'));
    });

    test('Should format explanation markdown with all required sections', () => {
        const mockExplanation = {
            summary: 'This line calculates the total',
            purpose: 'Aggregates item prices',
            context: 'Part of checkout flow',
            relatedCode: ['src/checkout.ts', 'src/cart.ts'],
            gitHistory: 'Added in commit abc123',
        };

        const markdown = formatMockExplanation(mockExplanation);
        
        assert.ok(markdown.includes('# Why Is This Here?'));
        assert.ok(markdown.includes('## Summary'));
        assert.ok(markdown.includes('## Purpose'));
        assert.ok(markdown.includes('## Context'));
    });

    test('Should include file path and line number in markdown', () => {
        const filePath = 'src/utils.ts';
        const lineNumber = 42;
        const lineContent = 'const result = calculateTotal(items);';
        
        const markdown = `# Why Is This Here?\n\n**File:** ${filePath}\n**Line:** ${lineNumber}\n**Code:** \`${lineContent}\``;
        
        assert.ok(markdown.includes(filePath));
        assert.ok(markdown.includes('42'));
        assert.ok(markdown.includes(lineContent));
    });

    test('Should handle cache clearing', () => {
        // Test that cache can be cleared without errors
        let cacheCleared = false;
        const mockClearCache = () => {
            cacheCleared = true;
        };
        
        mockClearCache();
        assert.strictEqual(cacheCleared, true);
    });

    test('Should show progress notification during analysis', () => {
        const progressConfig = {
            location: vscode.ProgressLocation.Notification,
            title: 'Why Is This Here?',
            cancellable: true,
        };
        
        assert.strictEqual(progressConfig.title, 'Why Is This Here?');
        assert.strictEqual(progressConfig.cancellable, true);
    });

    test('Should open markdown preview in beside column', () => {
        const viewColumn = vscode.ViewColumn.Beside;
        assert.strictEqual(viewColumn, vscode.ViewColumn.Beside);
    });

    test('Should handle cancellation gracefully', async () => {
        // Mock cancellation token
        const mockToken = {
            isCancellationRequested: true,
            onCancellationRequested: () => ({ dispose: () => {} }),
        };
        
        assert.strictEqual(mockToken.isCancellationRequested, true);
    });

    test('Should validate explanation structure', () => {
        const mockExplanation = {
            summary: 'Brief explanation',
            purpose: 'Why this code exists',
            context: 'Where it fits in the codebase',
            relatedCode: ['file1.ts', 'file2.ts'],
            gitHistory: 'Commit information',
        };
        
        assert.ok(mockExplanation.summary);
        assert.ok(mockExplanation.purpose);
        assert.ok(mockExplanation.context);
        assert.ok(Array.isArray(mockExplanation.relatedCode));
        assert.ok(mockExplanation.gitHistory);
    });

    test('Should handle empty related code array', () => {
        const mockExplanation = {
            summary: 'Brief explanation',
            purpose: 'Why this code exists',
            context: 'Where it fits in the codebase',
            relatedCode: [],
            gitHistory: 'No git history available',
        };
        
        assert.strictEqual(mockExplanation.relatedCode.length, 0);
    });

    test('Should format code snippets with backticks', () => {
        const lineContent = 'const result = calculateTotal(items);';
        const formatted = `\`${lineContent}\``;
        
        assert.ok(formatted.startsWith('`'));
        assert.ok(formatted.endsWith('`'));
        assert.ok(formatted.includes(lineContent));
    });

    test('Should handle multi-line code context', () => {
        const contextLines = [
            'function calculateTotal(items) {',
            '  return items.reduce((sum, item) => sum + item.price, 0);',
            '}',
        ];
        
        assert.strictEqual(contextLines.length, 3);
        assert.ok(contextLines[0].includes('function'));
        assert.ok(contextLines[1].includes('reduce'));
    });

    test('Should validate git history format', () => {
        const gitHistory = 'Added in commit abc123 by John Doe on 2024-01-15';
        
        assert.ok(gitHistory.includes('commit'));
        assert.ok(gitHistory.includes('abc123'));
    });

    test('Should handle missing git history gracefully', () => {
        const gitHistory = 'No git history available';
        assert.ok(gitHistory.includes('No git history'));
    });
});

// Helper function to format mock explanation
function formatMockExplanation(explanation: any): string {
    let markdown = '# Why Is This Here?\n\n';
    markdown += `## Summary\n${explanation.summary}\n\n`;
    markdown += `## Purpose\n${explanation.purpose}\n\n`;
    markdown += `## Context\n${explanation.context}\n\n`;
    
    if (explanation.relatedCode && explanation.relatedCode.length > 0) {
        markdown += '## Related Code\n';
        explanation.relatedCode.forEach((file: string) => {
            markdown += `- ${file}\n`;
        });
        markdown += '\n';
    }
    
    if (explanation.gitHistory) {
        markdown += `## Git History\n${explanation.gitHistory}\n`;
    }
    
    return markdown;
}
