import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { PluginRegistry } from "./plugin-registry";
import { WorkerCapability } from "../sdk/worker-capability";

export class PluginLoader {
  constructor(
    private readonly registry: PluginRegistry,
    private readonly pluginsDir: string = path.join(__dirname, "../plugins")
  ) {}

  async loadAll(): Promise<void> {
    try {
      const files = await fs.readdir(this.pluginsDir);
      
      for (const file of files) {
        if (!file.endsWith(".ts") && !file.endsWith(".js")) {
          continue;
        }

        const fullPath = path.join(this.pluginsDir, file);
        try {
          let module: any;
          try {
            module = require(fullPath);
          } catch (reqErr) {
            // Fallback for ESM modules
            module = await import(fullPath);
          }
          this.registerModuleCapabilities(module);
        } catch (err) {
          console.error(`Failed to load plugin from ${file}:`, err);
        }
      }
    } catch (err) {
      console.error(`Failed to read plugins directory ${this.pluginsDir}:`, err);
    }
  }

  private registerModuleCapabilities(module: any): void {
    const exportsToScan = Array.from(new Set([module.default, ...Object.values(module)]));

    for (const exp of exportsToScan) {
      if (this.isValidCapability(exp)) {
        if (!this.isPlatformSupported(exp.platform)) {
          console.log(
            `Skipping capability ${exp.id} - not supported on platform ${os.platform()}`
          );
          continue;
        }

        try {
          this.registry.register(exp);
          console.log(`Registered capability: ${exp.id} (${exp.name} v${exp.version})`);
        } catch (err) {
          console.error(`Failed to register capability ${exp.id}:`, err instanceof Error ? err.message : String(err));
        }
      }
    }
  }

  private isValidCapability(obj: any): obj is WorkerCapability {
    return (
      obj &&
      typeof obj === "object" &&
      typeof obj.id === "string" &&
      typeof obj.name === "string" &&
      typeof obj.version === "string" &&
      typeof obj.description === "string" &&
      typeof obj.category === "string" &&
      obj.inputSchema &&
      typeof obj.execute === "function"
    );
  }

  private isPlatformSupported(platforms?: string[]): boolean {
    if (!platforms || platforms.length === 0 || platforms.includes("all")) {
      return true;
    }
    return platforms.includes(os.platform());
  }
}
