import { CapabilityPlugin } from "../sdk/capability-plugin";

export class EchoPlugin extends CapabilityPlugin {
  readonly id = "echo";
  readonly version = "1.0.0";

  async initialize(): Promise<void> {}

  async health(): Promise<"READY" | "DEGRADED" | "UNHEALTHY"> {
    await Promise.resolve();
    return "READY";
  }

  async shutdown(): Promise<void> {}

  async cancel(): Promise<void> {}

  async execute(args: unknown): Promise<unknown> {
    await Promise.resolve();
    return {
      message: "Hello from Worker",
      input: args,
      timestamp: new Date().toISOString(),
    };
  }
}
