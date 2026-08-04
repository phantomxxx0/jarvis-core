import { WorkerRecord } from '../capability-registry.service';

export interface SelectionStrategy {
  selectWorker(workers: WorkerRecord[]): WorkerRecord | undefined;
}
