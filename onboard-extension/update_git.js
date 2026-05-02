const fs = require('fs');
let c = fs.readFileSync('src/features/why-is-this-here/git.ts', 'utf8');

c = c.replace(/await execAsync\(\s*'git config --get remote\.origin\.url',/g, 
  "await execFileAsync('git', ['config', '--get', 'remote.origin.url'],");

c = c.replace(/await execAsync\('git rev-parse --git-dir',/g, 
  "await execFileAsync('git', ['rev-parse', '--git-dir'],");

c = c.replace(/await execAsync\('git branch --show-current',/g, 
  "await execFileAsync('git', ['branch', '--show-current'],");

fs.writeFileSync('src/features/why-is-this-here/git.ts', c);
