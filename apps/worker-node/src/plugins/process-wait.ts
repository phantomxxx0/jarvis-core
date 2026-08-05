import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { processManager } from "../services/process-manager";

const InputSchema = z.object({
  processId: z.string(),
  timeoutMs: z.number().optional().default(30000),
});

const OutputSchema = z.object({
  status: z.string(),
  exitCode: z.number().nullable(),
});

export const processWait: WorkerCapability = {
  id: "process.wait",
  name: "Process Wait",
  version: "1.0.0",
  description: "Wait for a managed background process to complete",
  category: "system",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);

    const info = await processManager.waitProcess(
      parsed.processId,
      parsed.timeoutMs,
    );

    return {
      status: info.status,
      exitCode: info.exitCode,
    };
  },
};

export default processWait;
