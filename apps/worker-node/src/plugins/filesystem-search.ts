import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import type {} from "../sdk/worker-capability";

const InputSchema = z.object({
  root: z.string(),
  pattern: z.string(),
  recursive: z.boolean().optional().default(true),
});

const OutputSchema = z.object({
  matches: z.array(z.string()),
});

export const filesystemSearch: WorkerCapability = {
  id: "filesystem.search",
  name: "Filesystem Search",
  version: "1.0.0",
  description: "Search for files by name within a directory",
  category: "filesystem",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);
    const result = await sandbox.search(
      parsed.root,
      parsed.pattern,
      parsed.recursive,
    );
    return result;
  },
};

export default filesystemSearch;
