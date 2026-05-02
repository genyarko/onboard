import * as assert from 'assert';
import * as path from 'path';
import { sanitizePath } from '../../utils/security';

suite('Security Utils Test Suite', () => {
    test('sanitizePath should prevent path traversal', () => {
        // Mocking a Windows path
        const workspaceRoot = 'C:\\foo\\bar';
        
        // This should be rejected because it resolves to C:\foo\bar_baz\file.txt,
        // which starts with 'C:\foo\bar' when using string startsWith without trailing slash,
        // but is actually a traversal outside the workspace.
        const targetPath = '..\\bar_baz\\file.txt';
        
        const result = sanitizePath(workspaceRoot, targetPath);
        assert.strictEqual(result, null, 'Path traversal should be blocked');
    });

    test('sanitizePath should allow paths inside workspace', () => {
        const workspaceRoot = 'C:\\foo\\bar';
        const targetPath = 'src\\index.ts';
        
        const result = sanitizePath(workspaceRoot, targetPath);
        assert.strictEqual(result, path.resolve(workspaceRoot, targetPath), 'Valid path should be allowed');
    });

    test('sanitizePath should block absolute paths outside workspace', () => {
        const workspaceRoot = 'C:\\foo\\bar';
        const targetPath = 'C:\\windows\\system32\\cmd.exe';
        
        const result = sanitizePath(workspaceRoot, targetPath);
        assert.strictEqual(result, null, 'Absolute path outside workspace should be blocked');
    });

    test('sanitizePath should return null for empty inputs', () => {
        assert.strictEqual(sanitizePath('', 'file.txt'), null);
        assert.strictEqual(sanitizePath('C:\\foo\\bar', ''), null);
    });
});
