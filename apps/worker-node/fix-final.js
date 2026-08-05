const fs = require('fs');

// docker-inspect.ts
let dInspect = fs.readFileSync('src/plugins/docker-inspect.ts', 'utf8');
dInspect = dInspect.replace(/let info = \[\];/, 'let info: unknown[] = [];');
dInspect = dInspect.replace(/info = JSON\.parse\(res\.stdout\);/, 'info = JSON.parse(res.stdout) as unknown[];');
fs.writeFileSync('src/plugins/docker-inspect.ts', dInspect);

// docker-ps.ts
let dPs = fs.readFileSync('src/plugins/docker-ps.ts', 'utf8');
dPs = dPs.replace(/return JSON\.parse\(line\);/, 'return JSON.parse(line) as unknown;');
fs.writeFileSync('src/plugins/docker-ps.ts', dPs);

// http-* files
const httpFiles = ['src/plugins/http-get.ts', 'src/plugins/http-post.ts', 'src/plugins/http-upload.ts'];
for (const file of httpFiles) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/let data;/g, 'let data: unknown;');
  content = content.replace(/data = await response\.json\(\);/g, 'data = (await response.json()) as unknown;');
  fs.writeFileSync(file, content);
}

