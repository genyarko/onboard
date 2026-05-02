const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.contributes.configuration.properties['onboard.excludePatterns'] = { 
    type: 'array', 
    items: { type: 'string' }, 
    default: [], 
    description: 'Glob patterns to exclude from analysis.' 
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
