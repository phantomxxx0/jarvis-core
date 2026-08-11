import { BrainRequest } from '../contracts/brain-request';
import { BrainRoute } from '../contracts/brain-route';
import { BrainRouteResult } from '../contracts/brain-route-result';
import { BrainRouteContext } from '../types/brain-route-context.type';

/**
 * Dispatches the request to the targets specified by the resolved route.
 */
export interface IBrainDispatcher {
  dispatch<TRequest extends BrainRequest = BrainRequest, TResult = unknown>(
    request: TRequest,
    route: BrainRoute,
    context?: BrainRouteContext,
  ): Promise<BrainRouteResult<TResult>>;
}
