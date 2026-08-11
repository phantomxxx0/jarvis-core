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

  /** Extensions that are executable at runtime. */
  private static readonly EXECUTABLE_EXTENSIONS = new Set([
    ".js",
    ".mjs",
    ".cjs",
  ]);

  async loadAll(): Promise<void> {
    try {
      const files = await fs.readdir(this.pluginsDir);

      for (const file of files) {
        const ext = path.extname(file);
        if (!PluginLoader.EXECUTABLE_EXTENSIONS.has(ext)) {
          // Skip .d.ts, .d.mts, .map, .ts, and any other non-runtime files
          continue;
        }

        const fullPath = path.join(this.pluginsDir, file);
        try {
          const module = (await import(fullPath)) as Record<string, unknown>;
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

  private registerModuleCapabilities(module: Record<string, unknown>): void {
    const exportsToScan = new Set<unknown>();

    const extract = (obj: unknown) => {
      if (obj && typeof obj === "object") {
        exportsToScan.add(obj);
        if ("default" in obj) {
          extract((obj as Record<string, unknown>).default);
        }
      }
    };

    extract(module.default);
    for (const val of Object.values(module)) {
      extract(val);
    }

    for (const exp of Array.from(exportsToScan)) {
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

  private isValidCapability(obj: unknown): obj is WorkerCapability {
    if (!obj || typeof obj !== "object") return false;

    const candidate = obj as Record<string, unknown>;

    // Only validate objects that look like they are intended to be capabilities
    if (!candidate.id && !candidate.execute) return false;

    const requiredString = ["id", "name", "version", "description", "category"];
    for (const field of requiredString) {
      if (typeof candidate[field] !== "string") {
        throw new Error(
          `Capability manifest invalid: missing or invalid string field '${field}' in ${typeof candidate.id === "string" ? candidate.id : "unknown"}`,
        );
      }
    }

    if (typeof candidate.execute !== "function") {
      throw new Error(
        `Capability manifest invalid: missing execute function in ${String(candidate.id)}`,
      );
    }

    if (!candidate.inputSchema) {
      throw new Error(
        `Capability manifest invalid: missing inputSchema in ${String(candidate.id)}`,
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
