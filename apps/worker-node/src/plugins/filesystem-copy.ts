import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import type {} from "../sdk/worker-capability";

const InputSchema = z.object({
  source: z.string().describe("Source path relative to workspace root"),
  destination: z
    .string()
    .describe("Destination path relative to workspace root"),
});

const OutputSchema = z.object({
  success: z.boolean(),
});

export const filesystemCopy: WorkerCapability = {
  id: "filesystem.copy",
  name: "Filesystem Copy",
  version: "1.0.0",
  description: "Copies a file or directory to a new location",
  category: "filesystem",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);
    return await sandbox.copy(parsed.source, parsed.destination);
  },
};

export default filesystemCopy;
