/**
 * Architecture-safe serializable error type for worker operations.
 */
export interface WorkerError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;
  readonly workerId: string;
}
