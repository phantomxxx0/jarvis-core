import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import { NetworkValidator } from "../utils/network-validator";
import * as fsp from "fs/promises";
import * as path from "path";

const InputSchema = z.object({
  url: z.string().url(),
  path: z.string().describe("File path to upload relative to workspace root"),
  method: z.enum(["POST", "PUT", "PATCH"]).optional().default("POST"),
  headers: z.record(z.string(), z.string()).optional(),
  fieldName: z
    .string()
    .optional()
    .default("file")
    .describe("Form field name for the file"),
});

const OutputSchema = z.object({
  status: z.number(),
  headers: z.record(z.string(), z.string()),
  data: z.unknown(),
});

export const httpUpload: WorkerCapability = {
  id: "http.upload",
  name: "HTTP Upload",
  version: "1.0.0",
  description: "Upload a file using multipart/form-data",
  category: "network",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);
    const absoluteFilePath = sandbox.resolveSafePath(parsed.path);

    const fileBuffer = await fsp.readFile(absoluteFilePath);

    // Constructing a multipart form data manually since Node's fetch
    // requires a Blob/File object inside FormData which can be tricky with raw buffers in older versions,
    // but in Node 18+ we can use standard FormData and Blob.
    const formData = new FormData();
    const fileBlob = new Blob([fileBuffer]);

    formData.append(
      parsed.fieldName,
      fileBlob,
      path.basename(absoluteFilePath),
    );

    await NetworkValidator.validateUrl(parsed.url);

    const response = await fetch(parsed.url, {
      method: parsed.method,
      headers: parsed.headers as Record<string, string>,
      body: formData,
    });

    const contentType = response.headers.get("content-type") || "";
    let data: unknown;

    if (contentType.includes("application/json")) {
      data = (await response.json()) as unknown;
    } else {
      data = await response.text();
    }

    const outHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      outHeaders[key] = value;
    });

    return {
      status: response.status,
      headers: outHeaders,
      data,
    };
  },
};

export default httpUpload;
