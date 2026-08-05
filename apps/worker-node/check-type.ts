import { z } from "zod";
import { JSONSchema7 } from "json-schema";
const Schema = z.object({ path: z.string() });
const x: JSONSchema7 = Schema.toJSONSchema();
