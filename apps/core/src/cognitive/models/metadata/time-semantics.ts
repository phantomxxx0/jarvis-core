export interface TimeSemantics {
  observedAt: Date;
  occurredAt: Date;
  receivedAt: Date;
  processedAt: Date;
  expiredAt: Date | null;
}
