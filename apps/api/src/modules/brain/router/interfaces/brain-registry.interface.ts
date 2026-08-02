import { BrainRouteTarget } from '../types/brain-route-target.type';

/**
 * Registry for discovering available execution targets dynamically.
 */
export interface IBrainRegistry {
  /**
   * Discovers active targets matching the provided capability or identifier.
   */
  discover(
    criteria: Partial<BrainRouteTarget>,
  ): Promise<ReadonlyArray<BrainRouteTarget>>;

  /**
   * Registers a new target in the system.
   */
  register(target: BrainRouteTarget): Promise<void>;

  /**
   * Unregisters an existing target from the system.
   */
  unregister(identifier: string): Promise<void>;
}
