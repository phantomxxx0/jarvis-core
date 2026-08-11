import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import { ProcessRunner } from "../utils/process-runner";

const InputSchema = z.object({
  cwd: z.string().optional().default(""),
  remote: z.string().optional().default("origin"),
  branch: z.string().optional(),
  force: z.boolean().optional().default(false),
});

const OutputSchema = z.object({
  success: z.boolean(),
  stdout: z.string(),
});

export const gitPush: WorkerCapability = {
  id: "git.push",
  name: "Git Push",
  version: "1.0.0",
  description: "Update remote refs along with associated objects",
  category: "developer",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);
    const safeCwd = sandbox.resolveSafePath(parsed.cwd);

    const args = ["push"];
    if (parsed.force) args.push("--force");
    args.push(parsed.remote);

    if (parsed.branch) {
      args.push(parsed.branch);
    }

    const res = await ProcessRunner.run("git", args, { cwd: safeCwd });

    if (res.exitCode !== 0) {
      throw new Error(`Git error: ${res.stderr || res.stdout}`);
    }

    return { success: true, stdout: res.stdout || res.stderr };
  },
};

export default gitPush;
