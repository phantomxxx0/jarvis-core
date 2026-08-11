import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import type {} from "../sdk/worker-capability";

const InputSchema = z.object({
  path: z.string(),
  content: z.string(),
  overwrite: z.boolean().optional().default(false),
});

const OutputSchema = z.object({
  success: z.boolean(),
});

export const filesystemWrite: WorkerCapability = {
  id: "filesystem.write",
  name: "Filesystem Write",
  version: "1.0.0",
  description:
    "Write content to a file (creates parent directories automatically)",
  category: "filesystem",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);
    const result = await sandbox.write(
      parsed.path,
      parsed.content,
      parsed.overwrite,
    );
    return result;
  },
};

export default filesystemWrite;
