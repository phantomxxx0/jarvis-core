import { z } from "zod";
import { WorkerCapability } from "../sdk/worker-capability";
import { NetworkValidator } from "../utils/network-validator";

const InputSchema = z.object({
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
});

const OutputSchema = z.object({
  status: z.number(),
  headers: z.record(z.string(), z.string()),
  data: z.unknown(),
});

export const httpPost: WorkerCapability = {
  id: "http.post",
  name: "HTTP POST",
  version: "1.0.0",
  description: "Perform an HTTP POST request",
  category: "network",
  inputSchema:
    InputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,
  outputSchema:
    OutputSchema.toJSONSchema() as unknown as import("json-schema").JSONSchema7,

  async execute(input: unknown) {
    const parsed = InputSchema.parse(input);

    let bodyData: BodyInit | undefined;
    const headers = (parsed.headers as Record<string, string>) || {};

    if (parsed.body) {
      if (typeof parsed.body === "string") {
        bodyData = parsed.body;
      } else {
        bodyData = JSON.stringify(parsed.body);
        if (!headers["Content-Type"]) {
          headers["Content-Type"] = "application/json";
        }
      }
    } else {
      bodyData = undefined;
    }

    await NetworkValidator.validateUrl(parsed.url);

    const response = await fetch(parsed.url, {
      method: "POST",
      headers: headers,
      body: bodyData,
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

export default httpPost;
