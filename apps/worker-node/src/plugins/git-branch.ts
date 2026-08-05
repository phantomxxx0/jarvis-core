import { z } from "zod";
import { WorkerCapability, WorkerContext } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import { ProcessRunner } from "../utils/process-runner";

const InputSchema = z.object({
  cwd: z.string().optional().default(""),
});

const OutputSchema = z.object({
  current: z.string(),
  branches: z.array(z.string()),
});

export const gitBranch: WorkerCapability = {
  id: "git.branch",
  name: "Git Branch",
  version: "1.0.0",
  description: "Get git branch information",
  category: "developer",
  inputSchema: InputSchema.toJSONSchema() as any,
  outputSchema: OutputSchema.toJSONSchema() as any,

  async execute(input: unknown, _context: WorkerContext) {
    const parsed = InputSchema.parse(input);
    const safeCwd = sandbox.resolveSafePath(parsed.cwd);

    const res = await ProcessRunner.run("git", ["branch", "--list"], {
      cwd: safeCwd,
    });

    if (res.exitCode !== 0) {
      throw new Error(`Git error: ${res.stderr}`);
    }

    const lines = res.stdout.split("\n").filter(Boolean);
    let current = "";
    const branches: string[] = [];

    for (const line of lines) {
      const isCurrent = line.startsWith("*");
      const branchName = line.substring(2).trim();
      if (isCurrent) {
        current = branchName;
      }
      branches.push(branchName);
    }

    return { current, branches };
  },
};

export default gitBranch;
