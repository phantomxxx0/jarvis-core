import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import type { WorkerContext } from "../sdk/worker-capability";

const InputSchema = z.object({
  path: z.string(),
  recursive: z.boolean().optional(),
});

const OutputSchema = z.object({
  entries: z.array(
    z.object({
      name: z.string(),
      path: z.string(),
      type: z.string(),
      size: z.number(),
      modifiedAt: z.string(),
    }),
  ),
});

export const filesystemList: WorkerCapability = {
  id: "filesystem.list",
  name: "Filesystem List",
  version: "1.0.0",
  description: "List contents of a directory",
  category: "filesystem",
  inputSchema: InputSchema.toJSONSchema() as any,
  outputSchema: OutputSchema.toJSONSchema() as any,

  async execute(input: unknown, _context: WorkerContext) {
    const parsed = InputSchema.parse(input);
    const entries = await sandbox.list(parsed.path, parsed.recursive);
    return { entries };
  },
};

export default filesystemList;
