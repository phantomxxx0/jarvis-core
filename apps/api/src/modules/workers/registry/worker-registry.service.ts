import { Injectable, Logger } from '@nestjs/common';
import { IWorkerRegistry } from '../interfaces/worker-registry.interface';
import { IWorker } from '../interfaces/worker.interface';
import { Worker } from '../contracts/worker';
import { WorkerKind } from '../enums/worker-kind.enum';
/**
 * Core registry managing the discovery and routing of tasks to specialized workers.
 */
@Injectable()
export class WorkerRegistryService implements IWorkerRegistry {
  private readonly logger = new Logger(WorkerRegistryService.name);
  private readonly workers = new Map<string, IWorker>();
  register(worker: IWorker): Promise<void> {
    const info = worker.getInfo();
    if (this.workers.has(info.id)) {
      this.logger.warn(
        `Worker with ID ${info.id} is already registered. Overwriting.`,
      );
    }
    this.workers.set(info.id, worker);
    this.logger.log(
      `Registered worker: ${info.name} [${info.id}] (Kind: ${info.kind})`,
    );
    return Promise.resolve();
  }
  unregister(workerId: string): Promise<void> {
    if (this.workers.has(workerId)) {
      this.workers.delete(workerId);
      this.logger.log(`Unregistered worker: [${workerId}]`);
    }
    return Promise.resolve();
  }
  getById(workerId: string): Promise<IWorker | undefined> {
    return Promise.resolve(this.workers.get(workerId));
  }
  discover(criteria: {
    kind?: WorkerKind;
    capabilityId?: string;
  }): Promise<ReadonlyArray<IWorker>> {
    const allWorkers = Array.from(this.workers.values());
    const filtered = allWorkers.filter((worker) => {
      const info = worker.getInfo();
      // Initially filtering by WorkerKind as requested.
      if (criteria.kind && info.kind !== criteria.kind) {
        return false;
      }
      return true;
    });
    return Promise.resolve(filtered);
  }
  listAll(): Promise<ReadonlyArray<Worker>> {
    return Promise.resolve(
      Array.from(this.workers.values()).map((worker) => worker.getInfo()),
    );
  }
}
