import { PluginRegistry } from "./plugin-registry";
import { TaskEnvelope, ResultEnvelope } from "../sdk/envelopes";
import { WorkerCapability } from "../sdk/worker-capability";

export class SandboxExecutor {
  private workerId?: string;

  constructor(private readonly registry: PluginRegistry) {}

  setWorkerId(workerId: string): void {
    this.workerId = workerId;
  }

  getCapabilities(): WorkerCapability[] {
    return this.registry.getAll();
  }

  async executeTask(envelope: TaskEnvelope): Promise<ResultEnvelope> {
    const capability = this.registry.getCapability(envelope.capabilityId);

    if (!capability) {
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
      console.log(`Executing capability ${envelope.capabilityId}`);
      // Robust try/catch implementation for this batch
      // Future iteration will wrap this in a worker_thread
      const result = await capability.execute(envelope.payload, {
        traceId: envelope.traceId,
        executionId: envelope.executionId,
        correlationId: envelope.correlationId,
        workerId: this.workerId,
      });

      console.log(`Execution successful`);

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
