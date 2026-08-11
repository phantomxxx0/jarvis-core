/**
 * Defines the strategy to be used when routing or resolving an event.
 */
export enum BrainRouteStrategy {
  /** Route to a single target. */
  SINGLE = 'SINGLE',
  /** Broadcast to all capable targets. */
  BROADCAST = 'BROADCAST',
  /** Route sequentially through multiple targets (e.g., pipeline). */
  SEQUENTIAL = 'SEQUENTIAL',
  /** Route to a fallback target if primary fails. */
  FALLBACK = 'FALLBACK',
  /** Parallel execution and aggregation. */
  PARALLEL = 'PARALLEL',
}
