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
      
      const inputRegex = /InputSchema\.toJSONSchema\(\)(?!\s*as\s*unknown)/g;
      const outputRegex = /OutputSchema\.toJSONSchema\(\)(?!\s*as\s*unknown)/g;
      
      let modified = false;
      if (inputRegex.test(content)) {
        content = content.replace(inputRegex, 'InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7');
        modified = true;
      }
      if (outputRegex.test(content)) {
        content = content.replace(outputRegex, 'OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7');
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDir(path.join(__dirname, 'src/plugins'));
