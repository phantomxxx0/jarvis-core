import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { PluginRegistry } from "./plugin-registry";
import { WorkerCapability } from "../sdk/worker-capability";

export class PluginLoader {
  constructor(
    private readonly registry: PluginRegistry,
    private readonly pluginsDir: string = path.join(__dirname, "../plugins"),
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
      console.error(
        `Failed to read plugins directory ${this.pluginsDir}:`,
        err,
      );
    }
  }

  private registerModuleCapabilities(module: any): void {
    const exportsToScan = Array.from(
      new Set([module.default, ...Object.values(module)]),
    );

    for (const exp of exportsToScan) {
      try {
        if (this.isValidCapability(exp)) {
          if (!this.isPlatformSupported(exp.platform)) {
            console.log(
              `Skipping capability ${exp.id} - not supported on platform ${os.platform()}`,
            );
            continue;
          }

          this.registry.register(exp);
          console.log(
            `Registered capability: ${exp.id} (${exp.name} v${exp.version})`,
          );
        }
      } catch (err) {
        console.error(
          `[FATAL] Plugin loading failed:`,
          err instanceof Error ? err.message : String(err),
        );
        throw err; // Fail hard on invalid or duplicate capabilities
      }
    }
  }

  private isValidCapability(obj: any): obj is WorkerCapability {
    if (!obj || typeof obj !== "object") return false;

    // Only validate objects that look like they are intended to be capabilities
    if (!obj.id && !obj.execute) return false;

    const requiredString = ["id", "name", "version", "description", "category"];
    for (const field of requiredString) {
      if (typeof obj[field] !== "string") {
        throw new Error(
          `Capability manifest invalid: missing or invalid string field '${field}' in ${obj.id || "unknown"}`,
        );
      }
    }

    if (typeof obj.execute !== "function") {
      throw new Error(
        `Capability manifest invalid: missing execute function in ${obj.id}`,
      );
    }

    if (!obj.inputSchema) {
      throw new Error(
        `Capability manifest invalid: missing inputSchema in ${obj.id}`,
      );
    }

    return true;
  }

  private isPlatformSupported(platforms?: string[]): boolean {
    if (!platforms || platforms.length === 0 || platforms.includes("all")) {
      return true;
    }
    return platforms.includes(os.platform());
  }
}
