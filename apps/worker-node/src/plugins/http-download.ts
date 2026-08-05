import { z } from "zod";
import { WorkerCapability, WorkerContext } from "../sdk/worker-capability";
import { sandbox } from "../services/filesystem-sandbox";
import { NetworkValidator } from "../utils/network-validator";
import * as path from "path";
import * as fsp from "fs/promises";
import crypto from "crypto";

const InputSchema = z.object({
  url: z.string().url(),
  filename: z.string().optional().describe("Optional custom filename"),
  headers: z.record(z.string(), z.string()).optional(),
});

const OutputSchema = z.object({
  path: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  checksum: z.string(),
  timestamp: z.string(),
});

export const httpDownload: WorkerCapability = {
  id: "http.download",
  name: "HTTP Download",
  version: "1.0.0",
  description: "Download a file and store it in the workspace",
  category: "network",
  inputSchema: InputSchema.toJSONSchema() as any,
  outputSchema: OutputSchema.toJSONSchema() as any,

  async execute(input: unknown, _context: WorkerContext) {
    const parsed = InputSchema.parse(input);

    const downloadsDir = ".jarvis/downloads";
    const absoluteDownloadsDir = sandbox.resolveSafePath(downloadsDir);

    try {
      await fsp.mkdir(absoluteDownloadsDir, { recursive: true });
    } catch {}

    await NetworkValidator.validateUrl(parsed.url);

    const response = await fetch(parsed.url, {
      method: "GET",
      headers: parsed.headers as Record<string, string>,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to download: ${response.status} ${response.statusText}`,
      );
    }

    let filename = parsed.filename;
    if (!filename) {
      const urlPath = new URL(parsed.url).pathname;
      filename = path.basename(urlPath);
      if (!filename) {
        filename = `download-${Date.now()}`;
      }
    }

    const filePath = path.join(downloadsDir, filename);
    const absoluteFilePath = sandbox.resolveSafePath(filePath);

    const buffer = await response.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);

    await fsp.writeFile(absoluteFilePath, nodeBuffer);

    const checksum = crypto
      .createHash("sha256")
      .update(nodeBuffer)
      .digest("hex");
    const mimeType =
      response.headers.get("content-type") || "application/octet-stream";
    const timestamp = new Date().toISOString();

    return {
      path: filePath,
      filename,
      mimeType,
      size: nodeBuffer.length,
      checksum,
      timestamp,
    };
  },
};

export default httpDownload;
