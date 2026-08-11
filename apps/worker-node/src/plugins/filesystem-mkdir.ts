import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import type {} from "../sdk/worker-capability";

const InputSchema = z.object({
  path: z.string().describe("Target directory path relative to workspace root"),
});

const OutputSchema = z.object({
  success: z.boolean(),
});

export const filesystemMkdir: WorkerCapability = {
  id: "filesystem.mkdir",
  name: "Filesystem Mkdir",
  version: "1.0.0",
  description: "Creates a directory and all necessary parent directories",
  category: "filesystem",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);
    return await sandbox.mkdir(parsed.path);
  },
};

export default filesystemMkdir;
