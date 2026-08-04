import { Injectable, Logger } from '@nestjs/common';
import { TaskEngineService } from './task-engine.service';
import { PlannerService } from '../planner/planner.service';
import { ValidatedBrainPlan } from '../reasoner/reasoner.service';

@Injectable()
export class ExecutionRunnerService {
  private readonly logger = new Logger(ExecutionRunnerService.name);

  constructor(
    private readonly taskEngine: TaskEngineService,
    private readonly planner: PlannerService,
  ) {}

  public async runWithSelfHealing(
    plan: ValidatedBrainPlan,
    maxRetries: number = 3,
  ): Promise<ValidatedBrainPlan> {
    let retriesLeft = maxRetries;

    while (retriesLeft >= 0) {
      this.logger.log(`Starting execution run. Retries left: ${retriesLeft}`);

      await this.taskEngine.executePlan(plan);

      if (plan.status === 'COMPLETED') {
        this.logger.log('Plan completed successfully.');
        break;
      }

      if (plan.status === 'FAILED') {
        if (retriesLeft === 0) {
          this.logger.error(`Plan failed and no retries left.`);
          break;
        }

        const failedSteps = plan.steps.filter((s) => s.status === 'FAILED');
        this.logger.warn(
          `Plan execution failed. Found ${failedSteps.length} failed steps. Initiating dynamic recovery attempt...`,
        );

        for (const step of failedSteps) {
          this.logger.warn(
            `Extracting error from step ${step.id}: ${step.error}`,
          );

          const correctedArgs = await this.planner.generateCorrectionArgs(step);

          step.arguments = correctedArgs;
          step.status = 'PENDING';
          step.error = undefined;
        }

        retriesLeft--;
        this.logger.log(
          `Attempting self-healing retry ${maxRetries - retriesLeft} / ${maxRetries}`,
        );
      }
    }

    return plan;
  }
}
