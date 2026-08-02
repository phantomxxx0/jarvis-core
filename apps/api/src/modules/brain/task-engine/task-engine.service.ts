import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ExecutionPlan } from '../contracts/execution-plan';
import { ExecutionResult } from '../contracts/execution-result';
import { WorkerRegistryService } from '../../workers/registry/worker-registry.service';
import { TaskRouterService } from '../router/task-router.service';
import { BrainEvent } from '../events/enums/brain-event.enum';

@Injectable()
export class TaskEngineService {
  private readonly logger = new Logger(TaskEngineService.name);

  constructor(
    private readonly workerRegistry: WorkerRegistryService,
    private readonly taskRouter: TaskRouterService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(executionPlan: ExecutionPlan): Promise<ExecutionResult[]> {
    this.logger.log(`Executing ExecutionPlan ${executionPlan.id}`);

    executionPlan.status = 'RUNNING';
    this.eventEmitter.emit(BrainEvent.EXECUTION_STARTED, { executionPlan });

    const results: ExecutionResult[] = [];

    // Real DAG traversal will evaluate dependencies.
    // For now, we process tasks linearly as they are passed.
    for (const task of executionPlan.pendingTasks) {
      task.status = 'RUNNING';
      try {
        const workerKind = this.taskRouter.resolve(task.capabilityRequired);
        const workers = await this.workerRegistry.discover({
          kind: workerKind,
        });

        if (workers.length === 0) {
          throw new Error(
            `No worker available for capability ${task.capabilityRequired}`,
          );
        }

        const worker = workers[0]; // pick first matching worker

        const response = await worker.execute(task.inputs);

        if (!response.success) {
          throw new Error(response.error?.message || 'Worker execution failed');
        }

        task.status = 'COMPLETED';
        const result: ExecutionResult = {
          taskId: task.id,
          status: 'SUCCESS',
          output: response.data,
        };

        executionPlan.completedTasks.push(result);
        results.push(result);
      } catch (error) {
        task.status = 'FAILED';
        const result: ExecutionResult = {
          taskId: task.id,
          status: 'FAILED',
          output: null,
          error: error instanceof Error ? error.message : String(error),
        };
        executionPlan.completedTasks.push(result);
        results.push(result);
      }
    }

    const allSuccessful = results.every((r) => r.status === 'SUCCESS');
    executionPlan.status = allSuccessful ? 'COMPLETED' : 'FAILED';
    executionPlan.pendingTasks = []; // all consumed

    this.eventEmitter.emit(BrainEvent.EXECUTION_FINISHED, { executionPlan });

    this.logger.log(
      `ExecutionPlan ${executionPlan.id} finished with status ${executionPlan.status}`,
    );

    return results;
  }
}
