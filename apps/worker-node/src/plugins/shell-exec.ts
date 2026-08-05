import { z } from "zod";
import { WorkerCapability, WorkerContext } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import { ProcessRunner } from "../utils/process-runner";

const InputSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional().default([]),
  cwd: z.string().optional().default(""),
  timeoutMs: z.number().optional().default(30000),
});

const OutputSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number(),
});

export const shellExec: WorkerCapability = {
  id: "shell.exec",
  name: "Shell Exec",
  version: "1.0.0",
  description: "Execute a sandboxed shell command",
  category: "developer",
  inputSchema: InputSchema.toJSONSchema() as any,
  outputSchema: OutputSchema.toJSONSchema() as any,

  async execute(input: unknown, _context: WorkerContext) {
    const parsed = InputSchema.parse(input);
    const safeCwd = sandbox.resolveSafePath(parsed.cwd);

    // We enforce safety by ensuring cwd is inside the workspace.
    const result = await ProcessRunner.run(parsed.command, parsed.args, {
      cwd: safeCwd,
      timeoutMs: parsed.timeoutMs,
      shell: false,
    });

    return result;
  },
};

export default shellExec;
