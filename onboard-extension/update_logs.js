const fs = require('fs');
const files = [
    'src/extension.ts',
    'src/features/day-n-plan/command.ts',
    'src/features/repo-xray/command.ts',
    'src/features/why-is-this-here/git.ts',
    'src/features/starter-tasks/command.ts'
];

for (const file of files) {
    try {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/console\.error\(/g, 'Logger.error(');
        content = content.replace(/console\.debug\(/g, 'Logger.debug(');
        content = content.replace(/console\.log\(/g, 'Logger.info(');
        
        let depth = file.split('/').length - 2;
        let importPath = depth === 0 ? './utils/logger' : '../'.repeat(depth) + 'utils/logger';
        let importStmt = `import { Logger } from '${importPath}';\n`;
        
        if (!content.includes('import { Logger }')) {
            content = importStmt + content;
            fs.writeFileSync(file, content);
            console.log(`Updated ${file}`);
        }
    } catch(e) {
        console.log(`Failed ${file}: ${e}`);
    }
}
