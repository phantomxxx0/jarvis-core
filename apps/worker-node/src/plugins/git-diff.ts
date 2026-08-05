import { z } from "zod";
import { WorkerCapability, WorkerContext } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import { ProcessRunner } from "../utils/process-runner";

const InputSchema = z.object({
  cwd: z.string().optional().default(""),
  staged: z.boolean().optional().default(false),
  file: z.string().optional(),
});

const OutputSchema = z.object({
  diff: z.string(),
});

export const gitDiff: WorkerCapability = {
  id: "git.diff",
  name: "Git Diff",
  version: "1.0.0",
  description: "Get git diff for a repository",
  category: "developer",
  inputSchema: InputSchema.toJSONSchema() as any,
  outputSchema: OutputSchema.toJSONSchema() as any,

  async execute(input: unknown, _context: WorkerContext) {
    const parsed = InputSchema.parse(input);
    const safeCwd = sandbox.resolveSafePath(parsed.cwd);

    const args = ["diff"];
    if (parsed.staged) {
      args.push("--staged");
    }
    if (parsed.file) {
      args.push("--", parsed.file);
    }

    const res = await ProcessRunner.run("git", args, { cwd: safeCwd });
    if (res.exitCode !== 0 && res.exitCode !== 1) {
      // git diff exits with 1 if there are differences and --exit-code is used, but normally 0. Either way, check stderr.
      if (res.stderr) {
        throw new Error(`Git error: ${res.stderr}`);
      }
    }

    return { diff: res.stdout };
  },
};

export default gitDiff;
