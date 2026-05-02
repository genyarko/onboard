import * as vscode from 'vscode';
import * as path from 'path';
import { getExcludePatterns } from './security';

/**
 * Generate a file tree representation of the workspace using VS Code's findFiles.
 * This approach respects .gitignore and avoids synchronous file system operations.
 */
export async function generateFileTree(rootPath: string, maxDepth: number = 4): Promise<string> {
    const excludePattern = `{${getExcludePatterns().join(',')}}`;
    
    // Use findFiles which is async and respects .gitignore by default
    const files = await vscode.workspace.findFiles('**/*', excludePattern, 10000); // 10000 is a reasonable limit to avoid overwhelming

    // Build a tree structure in memory
    type TreeNode = {
        name: string;
        isDirectory: boolean;
        children?: Map<string, TreeNode>;
    };

    const root: TreeNode = { name: 'root', isDirectory: true, children: new Map() };

    for (const fileUri of files) {
        // Get relative path from the rootPath
        const relativePath = path.relative(rootPath, fileUri.fsPath);
        if (relativePath.startsWith('..')) {continue;} // Outside of rootPath

        const parts = relativePath.split(path.sep);
        
        // Respect maxDepth
        if (parts.length > maxDepth + 1) {continue;}

        let currentNode = root;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isFile = i === parts.length - 1;
            
            if (!currentNode.children) {
                currentNode.children = new Map();
            }

            if (!currentNode.children.has(part)) {
                currentNode.children.set(part, {
                    name: part,
                    isDirectory: !isFile,
                });
            }
            
            if (!isFile) {
                currentNode = currentNode.children.get(part)!;
            }
        }
    }

    const lines: string[] = [];

    function traverse(node: TreeNode, prefix: string = '', depth: number = 0) {
        if (!node.children || depth > maxDepth) {return;}

        // Sort: directories first, then files, both alphabetically
        const sortedChildren = Array.from(node.children.values()).sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) {return -1;}
            if (!a.isDirectory && b.isDirectory) {return 1;}
            return a.name.localeCompare(b.name);
        });

        for (let i = 0; i < sortedChildren.length; i++) {
            const child = sortedChildren[i];
            const isLast = i === sortedChildren.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            const extension = isLast ? '    ' : '│   ';

            if (child.isDirectory) {
                lines.push(`${prefix}${connector}${child.name}/`);
                traverse(child, prefix + extension, depth + 1);
            } else {
                lines.push(`${prefix}${connector}${child.name}`);
            }
        }
    }

    traverse(root);
    return lines.join('\n');
}
