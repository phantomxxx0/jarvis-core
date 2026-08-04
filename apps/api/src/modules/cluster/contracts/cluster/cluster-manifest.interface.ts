export interface WorkerCapabilityMeta {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  platform: string[];
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface WorkerMeta {
  id: string;
  hostname: string;
  platform: string;
  arch: string;
  version: string;
  startedAt: string;
}

export interface ClusterManifest {
  clusterVersion: string;
  minimumWorkerVersion: string;
  supportedProtocols: string[];
  worker?: WorkerMeta;
  capabilities?: WorkerCapabilityMeta[];
}
