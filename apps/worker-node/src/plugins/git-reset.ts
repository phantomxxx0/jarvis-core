import { z } from "zod";
import { WorkerCapability, WorkerContext } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import { ProcessRunner } from "../utils/process-runner";

const InputSchema = z.object({
  cwd: z.string().optional().default(""),
  mode: z.enum(["soft", "mixed", "hard"]).optional().default("mixed"),
  commit: z.string().optional().default("HEAD"),
});

const OutputSchema = z.object({
  success: z.boolean(),
  stdout: z.string(),
});

export const gitReset: WorkerCapability = {
  id: "git.reset",
  name: "Git Reset",
  version: "1.0.0",
  description: "Reset current HEAD to the specified state",
  category: "developer",
  inputSchema: InputSchema.toJSONSchema() as any,
  outputSchema: OutputSchema.toJSONSchema() as any,

  async execute(input: unknown, _context: WorkerContext) {
    const parsed = InputSchema.parse(input);
    const safeCwd = sandbox.resolveSafePath(parsed.cwd);

    const args = ["reset", `--${parsed.mode}`, parsed.commit];

    const res = await ProcessRunner.run("git", args, { cwd: safeCwd });

    if (res.exitCode !== 0) {
      throw new Error(`Git error: ${res.stderr || res.stdout}`);
    }

    return { success: true, stdout: res.stdout || res.stderr };
  },
};

export default gitReset;
