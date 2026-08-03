import { Injectable, Logger } from '@nestjs/common';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { PlannerService } from '../planner/planner.service';
import { WorkerRegistryService } from '../../workers/registry/worker-registry.service';
import { TaskRouterService } from '../router/task-router.service';

@Injectable()
export class ExecutionRunnerService {
  private readonly logger = new Logger(ExecutionRunnerService.name);

  constructor(
    private readonly toolRegistry: ToolRegistryService,
    private readonly plannerService: PlannerService,
    private readonly workerRegistry: WorkerRegistryService,
    private readonly taskRouter: TaskRouterService,
  ) { }

  async executeTask(task: any, context: any = {}, maxRetries = 2): Promise<any> {
    let attempt = 0;
    let currentTask = { ...task };

    while (attempt < maxRetries) {
      attempt++;
      try {
        this.logger.log(`[ExecutionRunner] Running task "${currentTask.id || currentTask.name || currentTask.action}" (Attempt ${attempt}/${maxRetries})`);

        let output: any;
        const toolName = currentTask.action || currentTask.toolName || currentTask.capabilityRequired;
        const availableTools = this.toolRegistry.getAvailableTools().map((t) => t.name);

        if (toolName && availableTools.includes(toolName)) {
          this.logger.log(`[ExecutionRunner] Dispatching task to ToolRegistry: ${toolName}`);
          output = await this.toolRegistry.executeTool(
            toolName,
            currentTask.inputs || currentTask.params || currentTask.arguments || {},
          );
        } else {
          // Standard Worker Dispatch
          const workerKind = this.taskRouter.resolve(currentTask.capabilityRequired);
          const workers = await this.workerRegistry.discover({ kind: workerKind });

          if (workers.length === 0) {
            throw new Error(`No worker available for capability ${currentTask.capabilityRequired}`);
          }

          const worker = workers[0];
          const response = await worker.execute(currentTask.inputs || currentTask.params || {});

          if (!response.success) {
            throw new Error(response.error?.message || 'Worker execution failed');
          }
          output = response.data;
        }

        return output;
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        this.logger.warn(`[ExecutionRunner] Task failed on attempt ${attempt}: ${errorMsg}`);

        if (attempt >= maxRetries) {
          throw new Error(`Task failed after ${maxRetries} attempts. Last error: ${errorMsg}`);
        }

        // Self-Correction Loop
        this.logger.log(`[ExecutionRunner] Initiating self-correction...`);
        const correctionIntent = {
          goal: `Fix and retry failed task ${currentTask.action || currentTask.capabilityRequired}`,
          failedAction: currentTask.action || currentTask.capabilityRequired,
          failedArguments: currentTask.inputs || currentTask.params || {},
          errorMessage: errorMsg,
          primaryGoal: `Correct arguments/inputs due to execution error: ${errorMsg}`,
        };

        const correctivePlan = await this.plannerService.createPlan(correctionIntent, context);
        if (correctivePlan && correctivePlan.steps && correctivePlan.steps.length > 0) {
          const correctiveStep = correctivePlan.steps[0];
          currentTask.inputs = correctiveStep.arguments || (correctiveStep as any).inputs || currentTask.inputs;
          this.logger.log(`[ExecutionRunner] Applied self-corrected arguments: ${JSON.stringify(currentTask.inputs)}`);
        }
      }
    }
  }
}