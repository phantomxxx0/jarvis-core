import { BrainRequest } from '../contracts/brain-request';
import { BrainRouteResult } from '../contracts/brain-route-result';
import { BrainRouteContext } from '../types/brain-route-context.type';
import { IBrainResolver } from './brain-resolver.interface';
import { IBrainDispatcher } from './brain-dispatcher.interface';
import { IBrainRegistry } from './brain-registry.interface';

/**
 * Orchestrates the resolution and dispatching of execution requests across the Jarvis architecture.
 */
export interface IBrainRouter {
  readonly resolver: IBrainResolver;
  readonly dispatcher: IBrainDispatcher;
  readonly registry: IBrainRegistry;

  route<TRequest extends BrainRequest = BrainRequest, TResult = unknown>(
    request: TRequest,
    context?: BrainRouteContext,
  ): Promise<BrainRouteResult<TResult>>;
}
