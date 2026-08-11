import { IWorker } from './worker.interface';
import { WorkerKind } from '../enums/worker-kind.enum';

/**
 * Factory responsible for spawning or instantiating concrete workers.
 */
export interface IWorkerFactory {
  /** Creates or resolves a worker instance based on kind and configuration. */
  createWorker(
    kind: WorkerKind,
    config?: Record<string, unknown>,
  ): Promise<IWorker>;

  /** Indicates if this factory supports spawning workers of the given kind. */
  supports(kind: WorkerKind): boolean;
}
