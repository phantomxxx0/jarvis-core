import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import { ProcessRunner } from "../utils/process-runner";

const InputSchema = z.object({
  cwd: z.string().optional().default(""),
  command: z.string().describe("Compose command (up, down, ps, etc)"),
  args: z.array(z.string()).optional().default([]),
  file: z.string().optional().describe("Specify an alternate compose file"),
});

const OutputSchema = z.object({
  exitCode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
});

export const dockerCompose: WorkerCapability = {
  id: "docker.compose",
  name: "Docker Compose",
  version: "1.0.0",
  description: "Execute docker compose commands",
  category: "system",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);
    const safeCwd = sandbox.resolveSafePath(parsed.cwd);

    const dockerArgs = ["compose"];
    if (parsed.file) {
      dockerArgs.push("-f", parsed.file);
    }
    dockerArgs.push(parsed.command, ...parsed.args);

    const res = await ProcessRunner.run("docker", dockerArgs, { cwd: safeCwd });

    return {
      exitCode: res.exitCode,
      stdout: res.stdout,
      stderr: res.stderr,
    };
  },
};

export default dockerCompose;
