import { BrainRouteContext } from '../types/brain-route-context.type';
import { BrainRoutePriority } from '../enums/brain-route-priority.enum';

/**
 * Represents a synchronous execution request sent to the Brain architecture.
 */
export interface BrainRequest<TPayload = unknown> {
  readonly id: string;
  readonly intent: string;
  readonly timestamp: Date;
  readonly source: string;
  readonly priority: BrainRoutePriority;
  readonly payload: TPayload;
  readonly context?: BrainRouteContext;
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly sessionId?: string;
  readonly userId?: string;
  readonly deviceId?: string;
}
