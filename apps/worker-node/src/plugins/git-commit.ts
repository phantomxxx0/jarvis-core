import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import { ProcessRunner } from "../utils/process-runner";

const InputSchema = z.object({
  cwd: z.string().optional().default(""),
  message: z.string().describe("Commit message"),
  all: z
    .boolean()
    .optional()
    .default(false)
    .describe("Stage all modified and deleted files"),
});

const OutputSchema = z.object({
  success: z.boolean(),
  stdout: z.string(),
});

export const gitCommit: WorkerCapability = {
  id: "git.commit",
  name: "Git Commit",
  version: "1.0.0",
  description: "Record changes to the repository",
  category: "developer",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);
    const safeCwd = sandbox.resolveSafePath(parsed.cwd);

    const args = ["commit", "-m", parsed.message];
    if (parsed.all) {
      args.push("-a");
    }

    const res = await ProcessRunner.run("git", args, { cwd: safeCwd });

    if (res.exitCode !== 0) {
      throw new Error(`Git error: ${res.stderr || res.stdout}`);
    }

    return { success: true, stdout: res.stdout };
  },
};

export default gitCommit;
