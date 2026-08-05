import { z } from "zod";
const Schema = z.object({
  path: z.string(),
  encoding: z.enum(["utf8", "base64"]).optional().default("utf8")
});
console.log(JSON.stringify(Schema.toJSONSchema(), null, 2));
