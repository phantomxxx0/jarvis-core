import { z } from "zod";
import { WorkerCapability, WorkerContext } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import { ProcessRunner } from "../utils/process-runner";
import * as path from "path";
import * as fsp from "fs/promises";

const InputSchema = z.object({
  cwd: z.string().optional().default(""),
  url: z.string().describe("Repository URL to clone"),
  directory: z.string().optional().describe("Target directory relative to cwd"),
});

const OutputSchema = z.object({
  success: z.boolean(),
  stdout: z.string(),
});

export const gitClone: WorkerCapability = {
  id: "git.clone",
  name: "Git Clone",
  version: "1.0.0",
  description: "Clone a repository into a new directory",
  category: "developer",
  inputSchema: InputSchema.toJSONSchema() as any,
  outputSchema: OutputSchema.toJSONSchema() as any,

  async execute(input: unknown, _context: WorkerContext) {
    const parsed = InputSchema.parse(input);
    const safeCwd = sandbox.resolveSafePath(parsed.cwd);

    // Create cwd if it does not exist so we can clone into it
    try {
      await fsp.mkdir(safeCwd, { recursive: true });
    } catch {}

    const args = ["clone", parsed.url];
    if (parsed.directory) {
      args.push(parsed.directory);
    }

    const res = await ProcessRunner.run("git", args, { cwd: safeCwd });

    if (res.exitCode !== 0) {
      throw new Error(`Git error: ${res.stderr || res.stdout}`);
    }

    return { success: true, stdout: res.stdout || res.stderr };
  },
};

export default gitClone;
