import { PluginRegistry } from "./execution/plugin-registry";
import { SandboxExecutor } from "./execution/sandbox-executor";
import { JarvisWorkerRuntime } from "./runtime/jarvis-worker-runtime";
import { EchoPlugin } from "./plugins/echo-plugin";

async function bootstrap() {
  console.log("Bootstrapping Worker...");

  const registry = new PluginRegistry();

  const echoPlugin = new EchoPlugin();
  registry.register(echoPlugin);
  console.log("Registered plugin: echo");

  const executor = new SandboxExecutor(registry);
  const runtime = new JarvisWorkerRuntime(executor);

  runtime.start();

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
    runtime.stop();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to bootstrap worker node:", err);
  process.exit(1);
});
