import { BrainRouteStrategy } from '../enums/brain-route-strategy.enum';
import { BrainRoutePriority } from '../enums/brain-route-priority.enum';
import { BrainRouteTarget } from '../types/brain-route-target.type';

/**
 * Defines a destination and strategy for routing a specific request.
 */
export interface BrainRoute {
  readonly id: string;
  readonly intent: string;
  readonly strategy: BrainRouteStrategy;
  readonly targets: ReadonlyArray<BrainRouteTarget>;
  readonly priority: BrainRoutePriority;
}
