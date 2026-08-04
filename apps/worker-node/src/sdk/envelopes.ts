export interface TracingContext {
  traceId: string;
  executionId: string;
  correlationId: string;
}

export interface TaskEnvelope extends TracingContext {
  taskId: string;
  capabilityId: string;
  payload: Record<string, unknown>;
  timeoutMs?: number;
}

export interface ResultEnvelope extends TracingContext {
  taskId: string;
  status: "SUCCESS" | "FAILURE" | "CANCELLED";
  result?: Record<string, unknown>;
  error?: string;
}

export interface ProgressFrame extends TracingContext {
  taskId: string;
  progress: number;
  message?: string;
}

export interface HeartbeatFrame {
  nodeId: string;
  timestamp: Date;
  activeTasks: number;
  cpuLoad: number;
  ramUsage: number;
  gpuLoad?: number;
  vramUsage?: number;
  temperature?: number;
}
