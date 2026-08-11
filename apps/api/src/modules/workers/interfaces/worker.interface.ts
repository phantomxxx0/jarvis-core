import { Worker } from '../contracts/worker';
import { WorkerHealth } from '../contracts/worker-health';
import { WorkerResult } from '../contracts/worker-result';
import { WorkerContext } from '../types/worker-context.type';

/**
 * Represents the executable contract that any worker must implement.
 */
export interface IWorker {
  /** Retrieves the core configuration and identity of the worker. */
  getInfo(): Worker;

  /** Retrieves the current health and telemetry of the worker. */
  getHealth(): Promise<WorkerHealth>;

  /** Starts or initializes the worker's internal systems. */
  start(): Promise<void>;

  /** Stops the worker and cleans up resources. */
  stop(): Promise<void>;

  /** Executes a specific payload using the worker's capabilities. */
  execute<TPayload = unknown, TData = unknown>(
    payload: TPayload,
    context?: WorkerContext,
  ): Promise<WorkerResult<TData>>;

  /** Cancels a currently running execution on the worker. */
  cancel(executionId: string): Promise<void>;
}
