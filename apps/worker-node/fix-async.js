const fs = require('fs');
const path = require('path');

const files = [
  'src/plugins/system-info.ts',
  'src/plugins/process-kill.ts',
  'src/plugins/process-list.ts',
  'src/plugins/process-spawn.ts'
];

for (const file of files) {
  const fullPath = path.join(__dirname, file);
  let content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes('async execute(')) {
    if (!content.includes('await Promise.resolve();')) {
      content = content.replace('async execute(', 'async execute('); // NOOP
      // actually we want to insert it after the block opens
      content = content.replace(/async execute\([^)]*\)\s*\{/, '$&\n    await Promise.resolve();\n');
      fs.writeFileSync(fullPath, content);
    }
  } else if (content.includes('execute(') && file.includes('system-info.ts')) {
    content = content.replace(/execute\([^)]*\)\s*\{/, 'async execute(_input: unknown, context: WorkerContext) {\n    await Promise.resolve();\n');
    fs.writeFileSync(fullPath, content);
  }
}
