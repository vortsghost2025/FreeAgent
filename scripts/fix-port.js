// Quick fix for Oracle server.js
const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// Replace hardcoded port 3000 with env var
content = content.replace(/const PORT = 3000;/g, 'const PORT = process.env.PORT || 3847;');

fs.writeFileSync('server.js', content);
console.log('Fixed! Now run: PORT=3847 node server.js');
