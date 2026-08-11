import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import { ProcessRunner } from "../utils/process-runner";

const InputSchema = z.object({
  cwd: z.string().optional().default(""),
  branch: z.string().describe("Branch to merge into the current branch"),
});

const OutputSchema = z.object({
  success: z.boolean(),
  stdout: z.string(),
});

export const gitMerge: WorkerCapability = {
  id: "git.merge",
  name: "Git Merge",
  version: "1.0.0",
  description: "Join two or more development histories together",
  category: "developer",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);
    const safeCwd = sandbox.resolveSafePath(parsed.cwd);

    const res = await ProcessRunner.run("git", ["merge", parsed.branch], {
      cwd: safeCwd,
    });

    if (res.exitCode !== 0) {
      throw new Error(`Git error: ${res.stderr || res.stdout}`);
    }

    return { success: true, stdout: res.stdout || res.stderr };
  },
};

export default gitMerge;
