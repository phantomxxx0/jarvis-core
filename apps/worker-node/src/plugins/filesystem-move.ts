import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import type { WorkerContext } from "../sdk/worker-capability";

const InputSchema = z.object({
  source: z.string().describe("Source path relative to workspace root"),
  destination: z
    .string()
    .describe("Destination path relative to workspace root"),
});

const OutputSchema = z.object({
  success: z.boolean(),
});

export const filesystemMove: WorkerCapability = {
  id: "filesystem.move",
  name: "Filesystem Move",
  version: "1.0.0",
  description: "Moves a file or directory to a new location",
  category: "filesystem",
  inputSchema: InputSchema.toJSONSchema() as any,
  outputSchema: OutputSchema.toJSONSchema() as any,

  async execute(input: unknown, _context: WorkerContext) {
    const parsed = InputSchema.parse(input);
    return await sandbox.move(parsed.source, parsed.destination);
  },
};

export default filesystemMove;
