const fs = require('fs');

const path = 'src/execution/plugin-loader.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/let module: any;\s*try \{\s*module = require\(fullPath\);\s*\} catch \(reqErr\) \{\s*\/\/ Fallback for ESM modules\s*module = await import\(fullPath\);\s*\}/s, 'const module = (await import(fullPath)) as Record<string, unknown>;');
content = content.replace(/private registerModuleCapabilities\(module: any\): void \{/g, 'private registerModuleCapabilities(module: Record<string, unknown>): void {');
content = content.replace(/private isValidCapability\(obj: any\): obj is WorkerCapability \{[\s\S]*?return true;\s*\}/, `private isValidCapability(obj: unknown): obj is WorkerCapability {
    if (!obj || typeof obj !== "object") return false;

    const candidate = obj as Record<string, unknown>;

    // Only validate objects that look like they are intended to be capabilities
    if (!candidate.id && !candidate.execute) return false;

    const requiredString = ["id", "name", "version", "description", "category"];
    for (const field of requiredString) {
      if (typeof candidate[field] !== "string") {
        throw new Error(
          \`Capability manifest invalid: missing or invalid string field '\${field}' in \${String(candidate.id || "unknown")}\`,
        );
      }
    }

    if (typeof candidate.execute !== "function") {
      throw new Error(
        \`Capability manifest invalid: missing execute function in \${String(candidate.id)}\`,
      );
    }

    if (!candidate.inputSchema) {
      throw new Error(
        \`Capability manifest invalid: missing inputSchema in \${String(candidate.id)}\`,
      );
    }

    return true;
  }`);

fs.writeFileSync(path, content);
