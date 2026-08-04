import { SelectionStrategy } from './selection-strategy.interface';
import { WorkerRecord } from '../capability-registry.service';

export class FirstAvailableStrategy implements SelectionStrategy {
  selectWorker(workers: WorkerRecord[]): WorkerRecord | undefined {
    // Sort workers deterministically (e.g. by ID) to ensure deterministic planner behavior
    const sortedWorkers = [...workers].sort((a, b) => a.id.localeCompare(b.id));
    return sortedWorkers.find(w => w.status === 'ACTIVE');
  }
}
