import { Injectable, Logger } from '@nestjs/common';
import { ExecutionBuilderService } from '../task-engine/execution-builder.service';
import { ValidatedBrainPlan } from '../reasoner/reasoner.service';
import { BrainPlanStep } from '../planner/contracts/brain-plan-step';
import { ExecutionRunnerService } from './execution-runner.service';

@Injectable()
export class ExecutionSchedulerService {
  private readonly logger = new Logger(ExecutionSchedulerService.name);

  constructor(
    private readonly executionBuilder: ExecutionBuilderService,
    private readonly executionRunner: ExecutionRunnerService,
  ) {}

  public async schedulePlan(
    plan: ValidatedBrainPlan,
    context: unknown = {},
  ): Promise<void> {
    this.logger.log(`Scheduling execution for plan: ${plan.id}`);

    const graph = this.executionBuilder.buildExecutionGraph(plan);
    this.logger.log(
      `Graph built successfully. Total stages: ${graph.stages.length}`,
    );

    plan.status = 'RUNNING';

    for (let i = 0; i < graph.stages.length; i++) {
      const stage = graph.stages[i];
      this.logger.log(
        `--- Scheduling Stage ${i + 1}/${graph.stages.length} ---`,
      );

      try {
        // Execute steps in parallel
        // FIX: Pass the root `plan` down so we can sync results back
        await Promise.all(
          stage.steps.map((step) => this.scheduleStep(step, plan, context)),
        );
      } catch {
        this.logger.error(
          `Stage ${i + 1} failed. Halting DAG execution gracefully.`,
        );
        plan.status = 'FAILED';
        return;
      }

      this.logger.log(
        `--- Completed Stage ${i + 1}/${graph.stages.length} ---`,
      );
    }

    plan.status = 'COMPLETED';
    this.logger.log(`Execution scheduled & completed for plan: ${plan.id}`);
  }

  // FIX: Accept `plan: ValidatedBrainPlan` as the second argument
  private async scheduleStep(
    step: BrainPlanStep,
    plan: ValidatedBrainPlan, 
    context: unknown,
  ): Promise<void> {
    this.logger.log(
      `[Scheduling Step] ID: ${step.id} | Type: ${step.executionType} | Capability: ${step.capabilityRequired || 'N/A'}`,
    );

    try {
      step.status = 'RUNNING';
      const output = await this.executionRunner.executeTask(
        step as unknown as Record<string, unknown>,
        context,
        2, // maxRetries
      );
      
      step.output = output;
      step.status = 'COMPLETED';

      // FIX: Sync the output and status back to the original plan array
      const originalStep = plan.steps.find((s) => s.id === step.id);
      if (originalStep) {
        originalStep.status = 'COMPLETED';
        originalStep.output = output;
      }

    } catch (error) {
      step.status = 'FAILED';
      step.error = error instanceof Error ? error.message : String(error);
      
      // FIX: Sync the error and failure status back to the original plan array
      const originalStep = plan.steps.find((s) => s.id === step.id);
      if (originalStep) {
        originalStep.status = 'FAILED';
        originalStep.error = step.error;
      }

      throw error;
    }
  }
}
