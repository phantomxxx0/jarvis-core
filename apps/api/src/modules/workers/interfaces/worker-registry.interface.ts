import { Worker } from '../contracts/worker';
import { IWorker } from './worker.interface';
import { WorkerKind } from '../enums/worker-kind.enum';

/**
 * Central registry for discovering, routing to, and managing active workers.
 */
export interface IWorkerRegistry {
  /** Registers a new worker instance in the system. */
  register(worker: IWorker): Promise<void>;

  /** Removes a worker from the registry. */
  unregister(workerId: string): Promise<void>;

  /** Finds a specific worker by its ID. */
  getById(workerId: string): Promise<IWorker | undefined>;

  /** Discovers workers matching specific criteria (e.g., kind, capability). */
  discover(criteria: {
    kind?: WorkerKind;
    capabilityId?: string;
  }): Promise<ReadonlyArray<IWorker>>;

  /** Returns a list of all currently registered workers' metadata. */
  listAll(): Promise<ReadonlyArray<Worker>>;
}
