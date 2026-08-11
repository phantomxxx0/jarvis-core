import { BrainEventType } from '../enums/brain-event-type.enum';
import { BrainEventMetadata } from '../types/brain-event-metadata.type';

export interface BrainEventResponse<TResult = unknown> {
  readonly eventId: string;
  readonly type: BrainEventType;
  readonly timestamp: Date;
  readonly success: boolean;
  readonly result?: TResult;
  readonly error?: Error;
  readonly metadata?: BrainEventMetadata;
  readonly correlationId?: string;
}
