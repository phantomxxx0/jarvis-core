import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { PluginRegistry } from "../src/execution/plugin-registry";
import { PluginLoader } from "../src/execution/plugin-loader";
import { WorkerCapability } from "../src/sdk/worker-capability";
import { SandboxExecutor } from "../src/execution/sandbox-executor";

const mockCapability = (id: string, platform?: string[]): WorkerCapability => ({
  id,
  name: `Test Cap ${id}`,
  version: "1.0.0",
  description: "Test description",
  category: "test",
  platform: platform as any,
  inputSchema: { type: "object" },
  execute: async () => ({}),
});

describe("PluginSystem", () => {
  describe("PluginRegistry", () => {
    it("should register and retrieve a capability", () => {
      const registry = new PluginRegistry();
      const cap = mockCapability("test.cap1");
      
      registry.register(cap);
      
      expect(registry.getCapability("test.cap1")).toBe(cap);
      expect(registry.getAll()).toHaveLength(1);
    });

    it("should reject duplicate capability IDs", () => {
      const registry = new PluginRegistry();
      const cap1 = mockCapability("test.cap1");
      const cap2 = mockCapability("test.cap1");
      
      registry.register(cap1);
      
      expect(() => registry.register(cap2)).toThrow("Duplicate capability ID");
    });
  });

  describe("SandboxExecutor", () => {
    it("should expose capabilities from registry", () => {
      const registry = new PluginRegistry();
      const cap = mockCapability("test.cap1");
      registry.register(cap);
      
      const executor = new SandboxExecutor(registry);
      const caps = executor.getCapabilities();
      
      expect(caps).toHaveLength(1);
      expect(caps[0].id).toBe("test.cap1");
    });

    it("should return failure for unknown capability", async () => {
      const registry = new PluginRegistry();
      const executor = new SandboxExecutor(registry);
      
      const result = await executor.executeTask({
        traceId: "t1",
        executionId: "e1",
        correlationId: "c1",
        taskId: "task1",
        capabilityId: "unknown.cap",
        payload: {}
      });
      
      expect(result.status).toBe("FAILURE");
      expect(result.error).toContain("not found");
    });
  });

  describe("PluginLoader", () => {
    const testPluginsDir = path.join(__dirname, "test-plugins");

    beforeAll(async () => {
      // Create a temporary directory with some fake plugin files
      await fs.mkdir(testPluginsDir, { recursive: true });
      
      // Plugin 1: Valid
      const p1 = `
        module.exports = {
          default: {
            id: "test.plugin1",
            name: "Plugin 1",
            version: "1.0",
            description: "A valid plugin",
            category: "test",
            platform: ["all"],
            inputSchema: { type: "object" },
            execute: async () => {}
          }
        };
      `;
      
      // Plugin 2: Invalid (missing execute function)
      const p2 = `
        module.exports = {
          id: "test.plugin2",
          name: "Plugin 2",
          version: "1.0",
          description: "An invalid plugin",
          category: "test",
          inputSchema: { type: "object" }
        };
      `;

      // Plugin 3: Platform specific (unsupported)
      const unsupportedPlatform = os.platform() === "win32" ? "linux" : "win32";
      const p3 = `
        module.exports = {
          default: {
            id: "test.plugin3",
            name: "Plugin 3",
            version: "1.0",
            description: "Unsupported platform",
            category: "test",
            platform: ["${unsupportedPlatform}"],
            inputSchema: { type: "object" },
            execute: async () => {}
          }
        };
      `;

      await fs.writeFile(path.join(testPluginsDir, "p1.js"), p1);
      await fs.writeFile(path.join(testPluginsDir, "p2.js"), p2);
      await fs.writeFile(path.join(testPluginsDir, "p3.js"), p3);
      // Ignored file
      await fs.writeFile(path.join(testPluginsDir, "ignore.txt"), "hello");
    });

    afterAll(async () => {
      await fs.rm(testPluginsDir, { recursive: true, force: true });
    });

    it("should load valid plugins and skip invalid/unsupported ones", async () => {
      const registry = new PluginRegistry();
      const loader = new PluginLoader(registry, testPluginsDir);
      
      await loader.loadAll();
      
      const caps = registry.getAll();
      expect(caps).toHaveLength(1);
      expect(caps[0].id).toBe("test.plugin1");
    });
  });
});
