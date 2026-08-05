import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import type {} from "../sdk/worker-capability";

const InputSchema = z.object({
  path: z.string().describe("Target path relative to workspace root"),
});

const OutputSchema = z.object({
  isFile: z.boolean(),
  isDirectory: z.boolean(),
  size: z.number(),
  createdAt: z.string(),
  modifiedAt: z.string(),
});

export const filesystemStat: WorkerCapability = {
  id: "filesystem.stat",
  name: "Filesystem Stat",
  version: "1.0.0",
  description: "Gets file or directory statistics",
  category: "filesystem",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);
    return await sandbox.stat(parsed.path);
  },
};

export default filesystemStat;
