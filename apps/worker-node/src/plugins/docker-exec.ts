import { z } from "zod";
import { WorkerCapability, WorkerContext } from "../sdk/worker-capability";
import { ProcessRunner } from "../utils/process-runner";

const InputSchema = z.object({
  container: z.string().describe("Container name or ID"),
  command: z.string().describe("Command to execute"),
  args: z.array(z.string()).optional().default([]),
  env: z.record(z.string(), z.string()).optional(),
  user: z.string().optional(),
});

const OutputSchema = z.object({
  exitCode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
});

export const dockerExec: WorkerCapability = {
  id: "docker.exec",
  name: "Docker Exec",
  version: "1.0.0",
  description: "Run a command in a running container",
  category: "system",
  inputSchema: InputSchema.toJSONSchema() as any,
  outputSchema: OutputSchema.toJSONSchema() as any,

  async execute(input: unknown, _context: WorkerContext) {
    const parsed = InputSchema.parse(input);

    const dockerArgs = ["exec"];

    if (parsed.user) {
      dockerArgs.push("--user", parsed.user);
    }

    if (parsed.env) {
      for (const [key, val] of Object.entries(parsed.env)) {
        dockerArgs.push("--env", `${key}=${val}`);
      }
    }

    dockerArgs.push(parsed.container, parsed.command, ...parsed.args);

    const res = await ProcessRunner.run("docker", dockerArgs, {});

    return {
      exitCode: res.exitCode,
      stdout: res.stdout,
      stderr: res.stderr,
    };
  },
};

export default dockerExec;
