import { z } from "zod";
import { WorkerCapability, WorkerContext } from "../sdk/worker-capability";
import { processManager } from "../services/process-manager";

const InputSchema = z.object({
  processId: z.string(),
});

const OutputSchema = z.object({
  success: z.boolean(),
});

export const processKill: WorkerCapability = {
  id: "process.kill",
  name: "Process Kill",
  version: "1.0.0",
  description: "Kill a managed background process",
  category: "system",
  inputSchema: InputSchema.toJSONSchema() as any,
  outputSchema: OutputSchema.toJSONSchema() as any,

  async execute(input: unknown, _context: WorkerContext) {
    const parsed = InputSchema.parse(input);

    const success = processManager.killProcess(parsed.processId);

    return { success };
  },
};

export default processKill;
