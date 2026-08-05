import { CapabilityPlugin } from "../sdk/capability-plugin";
import { TracingContext } from "../sdk/envelopes";

export class EchoPlugin extends CapabilityPlugin {
  readonly id = "echo";
  readonly version = "1.0.0";

  async initialize(config: unknown): Promise<void> {}

  async health(): Promise<"READY" | "DEGRADED" | "UNHEALTHY"> {
    return "READY";
  }

  async shutdown(): Promise<void> {}

  async cancel(executionId: string): Promise<void> {}

  async execute(args: unknown, context: TracingContext): Promise<unknown> {
    return {
      message: "Hello from Worker",
      input: args,
      timestamp: new Date().toISOString(),
    };
  }
}
