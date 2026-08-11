import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import type {} from "../sdk/worker-capability";

const InputSchema = z.object({
  path: z.string().describe("Target path relative to workspace root"),
});

const OutputSchema = z.object({
  success: z.boolean(),
});

export const filesystemDelete: WorkerCapability = {
  id: "filesystem.delete",
  name: "Filesystem Delete",
  version: "1.0.0",
  description: "Deletes a file or directory recursively",
  category: "filesystem",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);
    return await sandbox.delete(parsed.path);
  },
};

export default filesystemDelete;
