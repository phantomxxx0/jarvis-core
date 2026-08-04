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
        await Promise.all(
          stage.steps.map((step) => this.scheduleStep(step, context)),
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

  private async scheduleStep(
    step: BrainPlanStep,
    context: unknown,
  ): Promise<void> {
    this.logger.log(
      `[Scheduling Step] ID: ${step.id} | Capability: ${step.capabilityRequired}`,
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
    } catch (error) {
      step.status = 'FAILED';
      step.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }
}
