export interface EventEnvelope {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  correlationId?: string;
  causationId?: string;
  priority: number;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  schemaVersion: string;
  producerVersion: string;
}
