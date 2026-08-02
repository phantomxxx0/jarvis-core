import { BrainRouteContext } from '../types/brain-route-context.type';
import { BrainRouteError } from '../types/brain-route-error.type';
import { BrainResponse } from './brain-response';

/**
 * Represents the outcome of a routing operation.
 */
export interface BrainRouteResult<TResult = unknown> {
  readonly success: boolean;
  readonly response?: BrainResponse<TResult>;
  readonly error?: BrainRouteError;
  readonly context?: BrainRouteContext;
  readonly fulfilledBy?: string;
}
