const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const regex1 = /,\s*_context:\s*WorkerContext\s*\)/g;
      const regex2 = /,\s*_context\s*\)/g;
      if (regex1.test(content) || regex2.test(content)) {
        content = content.replace(regex1, ')').replace(regex2, ')');
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
