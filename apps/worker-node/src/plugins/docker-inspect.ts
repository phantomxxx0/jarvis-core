import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { ProcessRunner } from "../utils/process-runner";

const InputSchema = z.object({
  container: z.string().describe("Container name or ID"),
});

const OutputSchema = z.object({
  info: z.array(z.any()),
});

export const dockerInspect: WorkerCapability = {
  id: "docker.inspect",
  name: "Docker Inspect",
  version: "1.0.0",
  description: "Return low-level information on Docker objects",
  category: "system",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);

    const args = ["inspect", parsed.container];

    const res = await ProcessRunner.run("docker", args, {});

    if (res.exitCode !== 0) {
      throw new Error(`Docker error: ${res.stderr || res.stdout}`);
    }

    let info: unknown[] = [];
    try {
      info = JSON.parse(res.stdout) as unknown[];
    } catch {
      throw new Error("Failed to parse docker inspect JSON output");
    }

    return { info };
  },
};

export default dockerInspect;
