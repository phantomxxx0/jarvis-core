import { BrainRequest } from '../contracts/brain-request';
import { BrainRoute } from '../contracts/brain-route';

/**
 * Resolves the appropriate route(s) for a given request.
 */
export interface IBrainResolver {
  resolve<TRequest extends BrainRequest = BrainRequest>(
    request: TRequest,
  ): Promise<BrainRoute>;
}
