import { z } from "zod";
import { WorkerCapability, WorkerContext } from "../sdk/worker-capability";
import { ProcessRunner } from "../utils/process-runner";

const InputSchema = z.object({
  container: z.string().describe("Container name or ID"),
  tail: z
    .string()
    .optional()
    .default("all")
    .describe("Number of lines to show from the end of the logs"),
});

const OutputSchema = z.object({
  logs: z.string(),
});

export const dockerLogs: WorkerCapability = {
  id: "docker.logs",
  name: "Docker Logs",
  version: "1.0.0",
  description: "Fetch the logs of a container",
  category: "system",
  inputSchema: InputSchema.toJSONSchema() as any,
  outputSchema: OutputSchema.toJSONSchema() as any,

  async execute(input: unknown, _context: WorkerContext) {
    const parsed = InputSchema.parse(input);

    const args = ["logs", "--tail", parsed.tail, parsed.container];

    const res = await ProcessRunner.run("docker", args, {});

    if (res.exitCode !== 0) {
      throw new Error(`Docker error: ${res.stderr || res.stdout}`);
    }

    return { logs: res.stdout || res.stderr };
  },
};

export default dockerLogs;
