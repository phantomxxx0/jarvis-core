/**
 * Identifies a specific execution target for a dispatched request.
 */
export interface BrainRouteTarget {
  readonly type: 'MODULE' | 'AGENT' | 'CAPABILITY' | 'NODE' | 'WORKER';
  readonly identifier: string;
  readonly capabilities?: string[];
}
