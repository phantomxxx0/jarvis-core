/**
 * Provides context during the routing process, carrying metadata or routing state.
 */
export type BrainRouteContext = {
  readonly correlationId?: string;
  readonly sessionId?: string;
  readonly metadata?: Record<string, unknown>;
  readonly history?: string[];
} & Record<string, unknown>;
