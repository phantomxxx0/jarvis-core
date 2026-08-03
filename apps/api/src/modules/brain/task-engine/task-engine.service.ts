import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ExecutionPlan } from '../contracts/execution-plan';
import { ExecutionResult } from '../contracts/execution-result';
import { WorkerRegistryService } from '../../workers/registry/worker-registry.service';
import { TaskRouterService } from '../router/task-router.service';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { PlannerService } from '../planner/planner.service';
import { BrainEvent } from '../events/enums/brain-event.enum';

@Injectable()
export class TaskEngineService {
  private readonly logger = new Logger(TaskEngineService.name);

  constructor(
    private readonly workerRegistry: WorkerRegistryService,
    private readonly taskRouter: TaskRouterService,
    private readonly toolRegistry: ToolRegistryService,
    private readonly plannerService: PlannerService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(executionPlan: ExecutionPlan): Promise<ExecutionResult[]> {
    this.logger.log(`Executing ExecutionPlan ${executionPlan.id}`);

    executionPlan.status = 'RUNNING';
    this.eventEmitter.emit(BrainEvent.EXECUTION_STARTED, { executionPlan });

    const results: ExecutionResult[] = [];

    for (const task of executionPlan.pendingTasks) {
      task.status = 'RUNNING';
      let attempt = 0;
      const maxRetries = 2;
      let success = false;
      let output: any = null;
      let lastError: string | null = null;

      while (attempt < maxRetries && !success) {
        attempt++;
        try {
          const toolName = (task as any).action || (task as any).toolName || task.capabilityRequired;
          const availableTools = this.toolRegistry.getAvailableTools().map((t) => t.name);

          if (toolName && availableTools.includes(toolName)) {
            this.logger.log(`Dispatching task [${task.id}] to ToolRegistry: ${toolName} (Attempt ${attempt})`);
            output = await this.toolRegistry.executeTool(
              toolName,
              (task as any).inputs || (task as any).params || {},
            );
          } else {
            const workerKind = this.taskRouter.resolve(task.capabilityRequired);
            const workers = await this.workerRegistry.discover({ kind: workerKind });

            if (workers.length === 0) {
              throw new Error(`No worker available for capability ${task.capabilityRequired}`);
            }

            const worker = workers[0];
            const response = await worker.execute((task as any).inputs || (task as any).params || {});

            if (!response.success) {
              throw new Error(response.error?.message || 'Worker execution failed');
            }
            output = response.data;
          }

          success = true;
        } catch (error: any) {
          lastError = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Task [${task.id}] failed on attempt ${attempt}: ${lastError}`);

          if (attempt < maxRetries) {
            this.logger.log(`[Self-Correction] Attempting to correct arguments/parameters for task [${task.id}]...`);
            try {
              const correctionIntent = {
                goal: `Fix and retry failed task ${(task as any).action || task.capabilityRequired}`,
                failedAction: (task as any).action || task.capabilityRequired,
                failedArguments: (task as any).inputs || (task as any).params || {},
                errorMessage: lastError,
                primaryGoal: `Correct parameters for execution due to error: ${lastError}`,
              };

              const correctivePlan = await this.plannerService.createPlan(correctionIntent, executionPlan);
              if (correctivePlan && correctivePlan.steps && correctivePlan.steps.length > 0) {
                const fixedStep = correctivePlan.steps[0];
                const fixedArgs = fixedStep.arguments || (fixedStep as any).inputs || (fixedStep as any).params;
                if (fixedArgs) {
                  if ((task as any).inputs) (task as any).inputs = fixedArgs;
                  if ((task as any).params) (task as any).params = fixedArgs;
                  this.logger.log(`[Self-Correction] Applied corrected inputs: ${JSON.stringify(fixedArgs)}`);
                }
              }
            } catch (corrErr) {
              this.logger.warn(`[Self-Correction] Planner correction failed: ${corrErr instanceof Error ? corrErr.message : String(corrErr)}`);
            }
          }
        }
      }

      if (success) {
        task.status = 'COMPLETED';
        const result: ExecutionResult = {
          taskId: task.id,
          status: 'SUCCESS',
          output,
        };
        executionPlan.completedTasks.push(result);
        results.push(result);
      } else {
        task.status = 'FAILED';
        const result: ExecutionResult = {
          taskId: task.id,
          status: 'FAILED',
          output: null,
          error: lastError || 'Execution failed after retries',
        };
        executionPlan.completedTasks.push(result);
        results.push(result);
      }
    }

    const allSuccessful = results.every((r) => r.status === 'SUCCESS');
    executionPlan.status = allSuccessful ? 'COMPLETED' : 'FAILED';
    executionPlan.pendingTasks = [];

    this.eventEmitter.emit(BrainEvent.EXECUTION_FINISHED, { executionPlan });

    this.logger.log(`ExecutionPlan ${executionPlan.id} finished with status ${executionPlan.status}`);
    return results;
  }
}