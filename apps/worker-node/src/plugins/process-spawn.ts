import { z } from "zod";
import { WorkerCapability, WorkerContext } from "../sdk/worker-capability";
import { processManager } from "../services/process-manager";

const InputSchema = z.object({
  command: z.string().describe("Command to execute"),
  args: z.array(z.string()).optional().default([]),
  cwd: z
    .string()
    .optional()
    .describe("Working directory relative to workspace"),
  env: z.record(z.string(), z.string()).optional(),
});

const OutputSchema = z.object({
  processId: z.string(),
});

export const processSpawn: WorkerCapability = {
  id: "process.spawn",
  name: "Process Spawn",
  version: "1.0.0",
  description: "Spawn a background process managed by the worker",
  category: "system",
  inputSchema: InputSchema.toJSONSchema() as any,
  outputSchema: OutputSchema.toJSONSchema() as any,

  async execute(input: unknown, _context: WorkerContext) {
    const parsed = InputSchema.parse(input);

    const processId = processManager.spawnProcess(parsed.command, parsed.args, {
      cwd: parsed.cwd,
      env: parsed.env,
    });

    return { processId };
  },
};

export default processSpawn;
