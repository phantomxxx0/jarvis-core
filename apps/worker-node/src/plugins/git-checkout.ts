import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import { ProcessRunner } from "../utils/process-runner";

const InputSchema = z.object({
  cwd: z.string().optional().default(""),
  branch: z.string().describe("Branch name or commit hash to checkout"),
  create: z.boolean().optional().default(false).describe("Create a new branch"),
});

const OutputSchema = z.object({
  success: z.boolean(),
  stdout: z.string(),
});

export const gitCheckout: WorkerCapability = {
  id: "git.checkout",
  name: "Git Checkout",
  version: "1.0.0",
  description: "Checkout a git branch or commit",
  category: "developer",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);
    const safeCwd = sandbox.resolveSafePath(parsed.cwd);

    const args = ["checkout"];
    if (parsed.create) {
      args.push("-b");
    }
    args.push(parsed.branch);

    const res = await ProcessRunner.run("git", args, { cwd: safeCwd });

    if (res.exitCode !== 0) {
      throw new Error(`Git error: ${res.stderr || res.stdout}`);
    }

    return { success: true, stdout: res.stdout || res.stderr };
  },
};

export default gitCheckout;
