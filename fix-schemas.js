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

      // Remove import
      if (content.includes('zod-to-json-schema')) {
        content = content.replace(/import\s+\{\s*zodToJsonSchema\s*\}\s+from\s+['"]zod-to-json-schema['"];?\n?/, '');
        modified = true;
      }

      // Replace inputSchema: zodToJsonSchema(InputSchema as any) as any,
      const inputRegex = /zodToJsonSchema\(\s*InputSchema[^)]*\)[^,]*/g;
      if (inputRegex.test(content)) {
        content = content.replace(inputRegex, 'InputSchema.toJSONSchema()');
        modified = true;
      }

      // Replace outputSchema
      const outputRegex = /zodToJsonSchema\(\s*OutputSchema[^)]*\)[^,]*/g;
      if (outputRegex.test(content)) {
        content = content.replace(outputRegex, 'OutputSchema.toJSONSchema()');
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed', fullPath);
      }
    }
  }
}

processDir(pluginsDir);
