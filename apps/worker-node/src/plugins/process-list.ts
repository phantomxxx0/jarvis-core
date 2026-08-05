import { z } from "zod";
import { WorkerCapability, WorkerContext } from "../sdk/worker-capability";
import { processManager } from "../services/process-manager";

const InputSchema = z.object({});

const OutputSchema = z.object({
  processes: z.array(
    z.object({
      processId: z.string(),
      command: z.string(),
      status: z.string(),
      exitCode: z.number().nullable(),
      startTime: z.string(),
    }),
  ),
});

export const processList: WorkerCapability = {
  id: "process.list",
  name: "Process List",
  version: "1.0.0",
  description: "List all managed background processes",
  category: "system",
  inputSchema: InputSchema.toJSONSchema() as any,
  outputSchema: OutputSchema.toJSONSchema() as any,

  async execute(input: unknown, _context: WorkerContext) {
    InputSchema.parse(input);

    const processes = processManager.getProcessList().map((p) => ({
      processId: p.processId,
      command: p.command,
      status: p.status,
      exitCode: p.exitCode,
      startTime: p.startTime,
    }));

    return { processes };
  },
};

export default processList;
