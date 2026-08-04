import { Injectable, Logger } from '@nestjs/common';
import { PlannerService } from '../planner/planner.service';
import { CapabilityRegistryService } from '../../registry/capability-registry.service';
import { TaskRouterService } from '../router/task-router.service';
import { ObservationManagerService } from '../../observation/services/observation-manager.service';

@Injectable()
export class ExecutionRunnerService {
  private readonly logger = new Logger(ExecutionRunnerService.name);

  constructor(
    private readonly plannerService: PlannerService,
    private readonly capabilityRegistry: CapabilityRegistryService,
    private readonly taskRouter: TaskRouterService,
    private readonly observationManager: ObservationManagerService,
  ) {}

  async executeTask(
    task: Record<string, unknown>,
    context: unknown = {},
    maxRetries = 2,
  ): Promise<unknown> {
    let attempt = 0;
    const currentTask = { ...task };
    const startTime = Date.now();

    while (attempt < maxRetries) {
      attempt++;
      try {
        this.logger.log(
          `[ExecutionRunner] Running task "${(currentTask.id as string) || (currentTask.name as string) || (currentTask.action as string)}" (Attempt ${attempt}/${maxRetries})`,
        );

        const capabilityName =
          (currentTask.action as string) ||
          (currentTask.toolName as string) ||
          (currentTask.capabilityRequired as string);

        const candidates =
          this.capabilityRegistry.getCandidates(capabilityName);
        if (!candidates || candidates.length === 0) {
          throw new Error(
            `Execution failed: No capability provider found for '${capabilityName}'`,
          );
        }

        // Basic Selection logic: Simply select the first provider (Scheduler will handle this later)
        const provider = candidates[0];

        this.logger.log(
          `[ExecutionRunner] Dispatching task '${capabilityName}' to provider '${provider.id}'`,
        );

        const output = await provider.execute(
          capabilityName,
          currentTask.inputs ||
            currentTask.params ||
            currentTask.arguments ||
            {},
        );

        await this.observationManager.ingestObservation({
          userId: 'system',
          source: 'BRAIN_EXECUTION',
          type: 'SYSTEM_EXECUTION',
          payload: {
            taskId: currentTask.id || currentTask.name,
            capability: capabilityName,
            success: true,
            output,
            durationMs: Date.now() - startTime,
          },
          confidence: 100,
          priority: 80,
        });

        return output;
      } catch (error: unknown) {
        const errRec = error as Record<string, unknown>;
        const errorMsg = (errRec.message as string) || String(error);
        this.logger.warn(
          `[ExecutionRunner] Task failed on attempt ${attempt}: ${errorMsg}`,
        );

        if (attempt >= maxRetries) {
          await this.observationManager.ingestObservation({
            userId: 'system',
            source: 'BRAIN_EXECUTION',
            type: 'SYSTEM_EXECUTION',
            payload: {
              taskId: currentTask.id || currentTask.name,
              capability: currentTask.action || currentTask.capabilityRequired,
              success: false,
              error: errorMsg,
              durationMs: Date.now() - startTime,
            },
            confidence: 100,
            priority: 100, // higher priority for errors
          });

          throw new Error(
            `Task failed after ${maxRetries} attempts. Last error: ${errorMsg}`,
          );
        }

        // Self-Correction Loop
        this.logger.log(`[ExecutionRunner] Initiating self-correction...`);
        const correctionIntent = {
          goal: `Fix and retry failed task ${(currentTask.action as string) || (currentTask.capabilityRequired as string)}`,
          failedAction: currentTask.action || currentTask.capabilityRequired,
          failedArguments: currentTask.inputs || currentTask.params || {},
          errorMessage: errorMsg,
          primaryGoal: `Correct arguments/inputs due to execution error: ${errorMsg}`,
        };

        const correctivePlan = await this.plannerService.createPlan(
          correctionIntent,
          context,
        );
        if (
          correctivePlan &&
          correctivePlan.steps &&
          correctivePlan.steps.length > 0
        ) {
          const correctiveStep = correctivePlan.steps[0];
          currentTask.inputs =
            correctiveStep.arguments ||
            (correctiveStep as unknown as Record<string, unknown>).inputs ||
            currentTask.inputs;
          this.logger.log(
            `[ExecutionRunner] Applied self-corrected arguments: ${JSON.stringify(currentTask.inputs)}`,
          );
        }
      }
    }
  }
}
