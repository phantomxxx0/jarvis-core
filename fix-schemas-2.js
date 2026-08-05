const fs = require('fs');
const path = require('path');

const pluginsDir = path.join(__dirname, 'apps/worker-node/src/plugins');

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Replace .toJSONSchema() with .toJSONSchema() as any
      // but only if it's not already casted
      const inputRegex = /InputSchema\.toJSONSchema\(\)(?!\s*as\s*any)/g;
      if (inputRegex.test(content)) {
        content = content.replace(inputRegex, 'InputSchema.toJSONSchema() as any');
        modified = true;
      }

      const outputRegex = /OutputSchema\.toJSONSchema\(\)(?!\s*as\s*any)/g;
      if (outputRegex.test(content)) {
        content = content.replace(outputRegex, 'OutputSchema.toJSONSchema() as any');
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDir(pluginsDir);
