import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const InputSchema = z.object({
  path: z.string(),
  encoding: z.enum(["utf8", "base64"]).optional().default("utf8")
});

console.log(JSON.stringify(zodToJsonSchema(InputSchema), null, 2));
