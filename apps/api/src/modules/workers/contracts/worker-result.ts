import { WorkerError } from '../types/worker-error.type';

/**
 * Represents the outcome of an execution processed by a worker.
 */
export interface WorkerResult<TData = unknown> {
  readonly workerId: string;
  readonly success: boolean;
  readonly data?: TData;
  readonly error?: WorkerError;
  readonly completedAt: Date;
  readonly executionDurationMs: number;
}
