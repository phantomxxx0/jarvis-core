import { z } from "zod";
import { WorkerCapability, WorkerContext } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import { ProcessRunner } from "../utils/process-runner";

const InputSchema = z.object({
  cwd: z.string().optional().default(""),
  remote: z.string().optional().default("origin"),
});

const OutputSchema = z.object({
  success: z.boolean(),
  stdout: z.string(),
});

export const gitFetch: WorkerCapability = {
  id: "git.fetch",
  name: "Git Fetch",
  version: "1.0.0",
  description: "Download objects and refs from another repository",
  category: "developer",
  inputSchema: InputSchema.toJSONSchema() as any,
  outputSchema: OutputSchema.toJSONSchema() as any,

  async execute(input: unknown, _context: WorkerContext) {
    const parsed = InputSchema.parse(input);
    const safeCwd = sandbox.resolveSafePath(parsed.cwd);

    const res = await ProcessRunner.run("git", ["fetch", parsed.remote], {
      cwd: safeCwd,
    });

    if (res.exitCode !== 0) {
      throw new Error(`Git error: ${res.stderr || res.stdout}`);
    }

    return { success: true, stdout: res.stdout || res.stderr };
  },
};

export default gitFetch;
