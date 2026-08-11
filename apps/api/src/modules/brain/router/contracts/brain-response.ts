import { BrainRouteContext } from '../types/brain-route-context.type';
import { BrainRouteError } from '../types/brain-route-error.type';

/**
 * Represents the result of a BrainRequest execution.
 */
export interface BrainResponse<TData = unknown> {
  readonly requestId: string;
  readonly timestamp: Date;
  readonly success: boolean;
  readonly data?: TData;
  readonly error?: BrainRouteError;
  readonly context?: BrainRouteContext;
  readonly correlationId?: string;
}
