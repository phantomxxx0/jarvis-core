import { PluginRegistry } from "./plugin-registry";
import { TaskEnvelope, ResultEnvelope } from "../sdk/envelopes";

export class SandboxExecutor {
  constructor(private readonly registry: PluginRegistry) {}

  async executeTask(envelope: TaskEnvelope): Promise<ResultEnvelope> {
    const plugin = this.registry.getPlugin(envelope.capabilityId);

    if (!plugin) {
      return {
        traceId: envelope.traceId,
        executionId: envelope.executionId,
        correlationId: envelope.correlationId,
        taskId: envelope.taskId,
        status: "FAILURE",
        error: `Capability ${envelope.capabilityId} not found on this worker`,
      };
    }

    try {
      // Robust try/catch implementation for this batch
      // Future iteration will wrap this in a worker_thread
      const result = await plugin.execute(envelope.payload, {
        traceId: envelope.traceId,
        executionId: envelope.executionId,
        correlationId: envelope.correlationId,
      });

      return {
        traceId: envelope.traceId,
        executionId: envelope.executionId,
        correlationId: envelope.correlationId,
        taskId: envelope.taskId,
        status: "SUCCESS",
        result: result as Record<string, unknown>,
      };
    } catch (error) {
      return {
        traceId: envelope.traceId,
        executionId: envelope.executionId,
        correlationId: envelope.correlationId,
        taskId: envelope.taskId,
        status: "FAILURE",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
