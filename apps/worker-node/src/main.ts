import { PluginRegistry } from "./execution/plugin-registry";
import { SandboxExecutor } from "./execution/sandbox-executor";
import { JarvisWorkerRuntime } from "./runtime/jarvis-worker-runtime";
import { PluginLoader } from "./execution/plugin-loader";
import { processManager } from "./services/process-manager";

async function bootstrap() {
  console.log("Bootstrapping Worker...");

  const registry = new PluginRegistry();
  const loader = new PluginLoader(registry);
  await loader.loadAll();

  const executor = new SandboxExecutor(registry);
  const runtime = new JarvisWorkerRuntime(executor);

  runtime.start();

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
    processManager.cleanupAll();
    runtime.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\nGracefully shutting down from SIGTERM");
    processManager.cleanupAll();
    runtime.stop();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to bootstrap worker node:", err);
  process.exit(1);
});
