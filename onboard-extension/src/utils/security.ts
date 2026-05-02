import * as path from 'path';

let vscode: any;
try {
    vscode = require('vscode');
} catch (e) {
    // Ignore error when running outside of VS Code
}

/**
 * Validates and sanitizes a file path to prevent path traversal attacks
 * and ensure the file is within the allowed workspace boundary.
 * 
 * @param workspaceRoot The root directory of the workspace
 * @param targetPath The path to validate
 * @returns The sanitized absolute path, or null if invalid
 */
export function sanitizePath(workspaceRoot: string, targetPath: string): string | null {
    if (!workspaceRoot || !targetPath) {return null;}

    // Resolve the path to an absolute path
    const resolvedPath = path.resolve(workspaceRoot, targetPath);

    // Check if the resolved path is safely inside the workspace root
    const relative = path.relative(workspaceRoot, resolvedPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        return null;
    }

    return resolvedPath;
}

/**
 * Returns a list of user-configured patterns to exclude from analysis
 * This is useful to avoid scanning sensitive files (e.g., .env, certs)
 */
export function getExcludePatterns(): string[] {
    let customExcludes: string[] = [];
    if (vscode && vscode.workspace) {
        const config = vscode.workspace.getConfiguration('onboard');
        customExcludes = config.get('excludePatterns', []);
    }
    
    // Default sensitive and binary directories to exclude
    const defaultExcludes = [
        '**/node_modules/**', 
        '**/.git/**', 
        '**/dist/**', 
        '**/build/**', 
        '**/out/**', 
        '**/.vscode/**', 
        '**/__pycache__/**', 
        '**/.pytest_cache/**', 
        '**/venv/**', 
        '**/.env/**', 
        '**/coverage/**', 
        '**/.next/**', 
        '**/.nuxt/**', 
        '**/eval/**'
    ];

    return [...new Set([...defaultExcludes, ...customExcludes])];
}
