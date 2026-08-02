/**
 * Carries contextual metadata throughout the planning process.
 */
export type BrainPlanContext = {
  readonly correlationId?: string;
  readonly sessionId?: string;
  readonly environment?: Record<string, unknown>;
  readonly limits?: Record<string, number>;
} & Record<string, unknown>;
