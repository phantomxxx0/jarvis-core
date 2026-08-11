import { BrainEventType } from '../enums/brain-event-type.enum';
import { BrainEventMetadata } from '../types/brain-event-metadata.type';

export interface BrainEvent<TPayload = unknown> {
  readonly id: string;
  readonly type: BrainEventType;
  readonly timestamp: Date;
  readonly source: string;
  readonly priority: number;
  readonly payload: TPayload;
  readonly metadata?: BrainEventMetadata;
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly requestId?: string;
  readonly sessionId?: string;
  readonly userId?: string;
  readonly deviceId?: string;
}
