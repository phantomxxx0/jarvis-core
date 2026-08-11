/**
 * Carries contextual metadata for worker execution,
 * independent of the brain module.
 */
export type WorkerContext = {
  readonly executionId?: string;
  readonly traceId?: string;
  readonly timeoutMs?: number;
  readonly environment?: Record<string, string>;
} & Record<string, unknown>;
