import { z } from "zod";
import { WorkerCapability, WorkerContext } from "../sdk/worker-capability";
import { NetworkValidator } from "../utils/network-validator";

const InputSchema = z.object({
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
});

const OutputSchema = z.object({
  status: z.number(),
  headers: z.record(z.string(), z.string()),
  data: z.unknown(),
});

export const httpGet: WorkerCapability = {
  id: "http.get",
  name: "HTTP GET",
  version: "1.0.0",
  description: "Perform an HTTP GET request",
  category: "network",
  inputSchema: InputSchema.toJSONSchema() as any,
  outputSchema: OutputSchema.toJSONSchema() as any,

  async execute(input: unknown, _context: WorkerContext) {
    const parsed = InputSchema.parse(input);

    await NetworkValidator.validateUrl(parsed.url);

    const response = await fetch(parsed.url, {
      method: "GET",
      headers: parsed.headers as Record<string, string>,
    });

    const contentType = response.headers.get("content-type") || "";
    let data;

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      status: response.status,
      headers,
      data,
    };
  },
};

export default httpGet;
