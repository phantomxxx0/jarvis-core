/**
 * Architecture-safe serializable error type for distributed systems.
 */
export interface BrainRouteError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;
  readonly targetId?: string;
}
