import { z } from "zod";
import { WorkerCapability, WorkerContext } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import { ProcessRunner } from "../utils/process-runner";

const InputSchema = z.object({
  cwd: z.string().optional().default(""),
});

const OutputSchema = z.object({
  branch: z.string(),
  ahead: z.number(),
  behind: z.number(),
  modified: z.array(z.string()),
  added: z.array(z.string()),
  untracked: z.array(z.string()),
});

export const gitStatus: WorkerCapability = {
  id: "git.status",
  name: "Git Status",
  version: "1.0.0",
  description: "Get structured git status for a repository",
  category: "developer",
  inputSchema: InputSchema.toJSONSchema() as any,
  outputSchema: OutputSchema.toJSONSchema() as any,

  async execute(input: unknown, _context: WorkerContext) {
    const parsed = InputSchema.parse(input);
    const safeCwd = sandbox.resolveSafePath(parsed.cwd);

    // Get branch and tracking info
    const branchRes = await ProcessRunner.run("git", ["status", "-sb"], {
      cwd: safeCwd,
    });
    if (branchRes.exitCode !== 0) {
      throw new Error(`Git error: ${branchRes.stderr}`);
    }

    const lines = branchRes.stdout.trim().split("\n");
    let branch = "unknown";
    let ahead = 0;
    let behind = 0;
    const modified: string[] = [];
    const added: string[] = [];
    const untracked: string[] = [];

    if (lines.length > 0 && lines[0].startsWith("##")) {
      const branchInfo = lines[0].substring(3).trim(); // remove '## '
      const match = branchInfo.match(
        /^([^.\s]+)(?:\.\.\.[^\s]+)?(?: \[ahead (\d+)(?:, behind (\d+))?\]| \[behind (\d+)\])?/,
      );
      if (match) {
        branch = match[1];
        if (match[2]) ahead = parseInt(match[2], 10);
        if (match[3]) behind = parseInt(match[3], 10);
        if (match[4]) behind = parseInt(match[4], 10);
      }
    }

    // Porcelein status
    const statusRes = await ProcessRunner.run(
      "git",
      ["status", "--porcelain"],
      { cwd: safeCwd },
    );
    if (statusRes.exitCode !== 0) {
      throw new Error(`Git error: ${statusRes.stderr}`);
    }

    const statusLines = statusRes.stdout.trim().split("\n").filter(Boolean);
    for (const line of statusLines) {
      const state = line.substring(0, 2);
      const file = line.substring(3).trim();

      if (state === "??") untracked.push(file);
      else if (state.includes("A")) added.push(file);
      else if (state.includes("M")) modified.push(file);
      else modified.push(file); // fallback for others like D, R, etc. for simplicity
    }

    return { branch, ahead, behind, modified, added, untracked };
  },
};

export default gitStatus;
