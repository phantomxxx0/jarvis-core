import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import { ProcessRunner } from "../utils/process-runner";

const InputSchema = z.object({
  cwd: z.string().optional().default(""),
  limit: z.number().optional().default(10),
});

const OutputSchema = z.object({
  commits: z.array(
    z.object({
      hash: z.string(),
      author: z.string(),
      date: z.string(),
      message: z.string(),
    }),
  ),
});

export const gitLog: WorkerCapability = {
  id: "git.log",
  name: "Git Log",
  version: "1.0.0",
  description: "Get structured git log",
  category: "developer",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);
    const safeCwd = sandbox.resolveSafePath(parsed.cwd);

    // Format: %H|%an|%aI|%s
    const format = "%H|%an|%aI|%s";
    const res = await ProcessRunner.run(
      "git",
      ["log", `-n`, parsed.limit.toString(), `--format=${format}`],
      { cwd: safeCwd },
    );

    if (res.exitCode !== 0) {
      throw new Error(`Git error: ${res.stderr}`);
    }

    const commits = res.stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, author, date, ...msgParts] = line.split("|");
        return {
          hash: hash || "",
          author: author || "",
          date: date || "",
          message: msgParts.join("|") || "",
        };
      });

    return { commits };
  },
};

export default gitLog;
