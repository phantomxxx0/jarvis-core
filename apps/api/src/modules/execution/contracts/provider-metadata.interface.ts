export interface ProviderMetadata {
  nodeId: string;
  platform: string;
  gpu?: string;
  cpu?: string;
  memory?: string;
  lastHeartbeat: Date;
  metrics?: {
    p50LatencyMs?: number;
    p95LatencyMs?: number;
    queueLength?: number;
    successRate?: number;
  };
}
