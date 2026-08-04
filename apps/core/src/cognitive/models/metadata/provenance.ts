export interface Provenance {
  workerId: string;
  pluginId: string;
  driverId: string;
  providerId: string;
  modelVersion?: string;
  traceId: string;
  artifactRef?: string;
}
