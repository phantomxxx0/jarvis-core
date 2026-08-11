import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import type {} from "../sdk/worker-capability";

const InputSchema = z.object({
  path: z.string(),
  encoding: z.enum(["utf8", "base64"]).optional().default("utf8"),
});

const OutputSchema = z.object({
  encoding: z.enum(["utf8", "base64"]),
  content: z.string(),
  size: z.number(),
});

export const filesystemRead: WorkerCapability = {
  id: "filesystem.read",
  name: "Filesystem Read",
  version: "1.0.0",
  description: "Read a file up to 10 MB in utf8 or base64 encoding",
  category: "filesystem",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);
    const result = await sandbox.read(parsed.path, parsed.encoding);
    return result;
  },
};

export default filesystemRead;
