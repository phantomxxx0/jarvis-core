import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { ProcessRunner } from "../utils/process-runner";

const InputSchema = z.object({
  all: z
    .boolean()
    .optional()
    .default(false)
    .describe("Show all containers (default shows just running)"),
});

const OutputSchema = z.object({
  containers: z.array(z.any()),
});

export const dockerPs: WorkerCapability = {
  id: "docker.ps",
  name: "Docker PS",
  version: "1.0.0",
  description: "List docker containers",
  category: "system",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);

    const args = ["ps", "--format", "{{json .}}"];
    if (parsed.all) {
      args.push("-a");
    }

    const res = await ProcessRunner.run("docker", args, {});

    if (res.exitCode !== 0) {
      throw new Error(`Docker error: ${res.stderr || res.stdout}`);
    }

    const containers = res.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as unknown;
        } catch {
          return line;
        }
      });

    return {
      containers: containers as {
        id: string;
        image: string;
        status: string;
        names: string;
        ports: string;
      }[],
    };
  },
};

export default dockerPs;
