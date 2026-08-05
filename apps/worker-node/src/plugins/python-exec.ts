import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import { ProcessRunner } from "../utils/process-runner";
import * as fsp from "fs/promises";
import * as path from "path";

const InputSchema = z.object({
  scriptContent: z.string(),
  cwd: z.string().optional().default(""),
  timeoutMs: z.number().optional().default(30000),
});

const OutputSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number(),
});

export const pythonExec: WorkerCapability = {
  id: "python.exec",
  name: "Python Exec",
  version: "1.0.0",
  description: "Execute Python script securely within the sandbox",
  category: "developer",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);
    const safeCwd = sandbox.resolveSafePath(parsed.cwd);

    // Write temporary script
    const tempFile = `.tmp_script_${Date.now()}_${Math.floor(Math.random() * 1000)}.py`;
    const tempPath = path.join(safeCwd, tempFile);
    await fsp.writeFile(tempPath, parsed.scriptContent);

    try {
      // Attempt python3 first, fallback behavior can be added later if needed.
      // Assuming a modern Linux/mac env where python3 is available.
      const result = await ProcessRunner.run("python3", [tempFile], {
        cwd: safeCwd,
        timeoutMs: parsed.timeoutMs,
      });
      return result;
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "ENOENT"
      ) {
        // Fallback to 'python' if 'python3' doesn't exist
        const result = await ProcessRunner.run("python", [tempFile], {
          cwd: safeCwd,
          timeoutMs: parsed.timeoutMs,
        });
        return result;
      }
      throw err;
    } finally {
      // Always clean up the temp script
      try {
        await fsp.unlink(tempPath);
      } catch {
        // ignore cleanup errors
      }
    }
  },
};

export default pythonExec;
