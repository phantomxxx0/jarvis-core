/**
 * Architecture-safe serializable error type for planning operations.
 */
export interface BrainPlanError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;
  readonly planId?: string;
  readonly stepId?: string;
}
