import { Injectable, Logger } from '@nestjs/common';
import {
  CapabilityRegistryService,
  WorkerRecord,
} from './capability-registry.service';
import { TaskRequest, TaskPlan } from '../contracts/task-plan.interface';
import { SelectionStrategy } from './strategies/selection-strategy.interface';
import { FirstAvailableStrategy } from './strategies/first-available.strategy';
import {
  CapabilityNotFoundException,
  NoEligibleWorkerException,
  PlannerValidationException,
} from '../exceptions/planner.exceptions';

@Injectable()
export class TaskPlannerService {
  private readonly logger = new Logger(TaskPlannerService.name);
  private selectionStrategy: SelectionStrategy;

  constructor(private readonly capabilityRegistry: CapabilityRegistryService) {
    // Default to FirstAvailableStrategy. Can be made configurable later.
    this.selectionStrategy = new FirstAvailableStrategy();
  }

  public planTask(request: TaskRequest): TaskPlan {
    if (!request.capabilityId) {
      throw new PlannerValidationException('capabilityId is required');
    }

    const capability = this.capabilityRegistry.getCapability(
      request.capabilityId,
    );
    if (!capability) {
      throw new CapabilityNotFoundException(request.capabilityId);
    }

    const candidates = capability.workerIds;

    // Resolve full worker records
    const eligibleWorkers: WorkerRecord[] = [];
    for (const workerId of candidates) {
      const worker = this.capabilityRegistry.getWorker(workerId);
      if (worker && worker.status === 'ACTIVE') {
        eligibleWorkers.push(worker);
      }
    }

    this.logger.log(`Requested capability: ${request.capabilityId}`);
    this.logger.log(`Candidates: ${candidates.length}`);
    this.logger.log(`Eligible: ${eligibleWorkers.length}`);

    const selectedWorker = this.selectionStrategy.selectWorker(eligibleWorkers);

    if (!selectedWorker) {
      throw new NoEligibleWorkerException(request.capabilityId);
    }

    this.logger.log(`Selected: ${selectedWorker.id}`);

    return {
      workerId: selectedWorker.id,
      capabilityId: request.capabilityId,
      reason: `Selected worker ${selectedWorker.id} because it advertises ${request.capabilityId} and is ACTIVE.`,
    };
  }
}
