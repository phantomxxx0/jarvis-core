import * as os from "os";
import { WorkerCapability, WorkerContext } from "../sdk/worker-capability";

const workerStartedAt = new Date().toISOString();

export default {
  id: "system.info",
  name: "System Information",
  version: "1.0.0",
  category: "system",
  description: "Returns runtime information about the worker host.",
  platform: ["all"],
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    properties: {
      worker: {
        type: "object",
        properties: {
          id: { type: "string" },
          hostname: { type: "string" },
          version: { type: "string" },
          startedAt: { type: "string" },
        },
      },
      system: {
        type: "object",
        properties: {
          platform: { type: "string" },
          arch: { type: "string" },
          release: { type: "string" },
          uptimeSeconds: { type: "number" },
        },
      },
      cpu: {
        type: "object",
        properties: {
          model: { type: "string" },
          cores: { type: "number" },
          loadAverage: { type: "array", items: { type: "number" } },
        },
      },
      memory: {
        type: "object",
        properties: {
          total: { type: "number" },
          free: { type: "number" },
          used: { type: "number" },
        },
      },
      runtime: {
        type: "object",
        properties: {
          node: { type: "string" },
          pid: { type: "number" },
        },
      },
      network: {
        type: "object",
        properties: {
          interfaces: { type: "array", items: { type: "string" } },
        },
      },
    },
  },

  async execute(_input: unknown, context: WorkerContext) {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();
    const netInterfaces = os.networkInterfaces();

    const interfaceNames = Object.keys(netInterfaces).filter(
      (name) => netInterfaces[name] && netInterfaces[name]!.length > 0
    );

    return {
      worker: {
        id: context.workerId || "unknown",
        hostname: os.hostname(),
        version: "1.0.0", // process.env.npm_package_version or hardcoded
        startedAt: workerStartedAt,
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        uptimeSeconds: os.uptime(),
      },
      cpu: {
        model: cpus.length > 0 ? cpus[0].model : "Unknown",
        cores: cpus.length,
        loadAverage: os.loadavg(),
      },
      memory: {
        total: totalMem,
        free: freeMem,
        used: totalMem - freeMem,
      },
      runtime: {
        node: process.version,
        pid: process.pid,
      },
      network: {
        interfaces: interfaceNames,
      },
    };
  },
} as WorkerCapability;
