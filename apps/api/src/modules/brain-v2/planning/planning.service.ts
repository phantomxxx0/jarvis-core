import { Injectable, Logger } from '@nestjs/common';
import type { PlanningResultV2 } from '../contracts/planning-result';
import { ExecutionPlanBuilder } from './execution-plan';
import { TaskDecomposer } from './task-decomposer';
import { Scheduler } from './scheduler';
import { randomUUID } from 'crypto';

/**
 * PlanningGateway (Brain V2)
 *
 * Native V2 planning component. Decomposes a goal into ordered steps via
 * TaskDecomposer and Scheduler. Invoked by the Executive's
 * ExecutionRouter ONLY when plan=true.
 */
@Injectable()
export class PlanningGateway {
  readonly moduleName = 'PlanningGateway';
  private readonly logger = new Logger(PlanningGateway.name);

  /** @implements ICognitiveModule */
  isReady(): boolean {
    return true;
  }

  /**
   * Creates a V2 execution plan via TaskDecomposer + Scheduler.
   *
   * @param goal      - The user's goal.
   * @param needsTool - Whether a tool invocation is expected.
   * @returns A PlanningResultV2.
   */
  async plan(
    goal: string,
    needsTool: boolean,
  ): Promise<PlanningResultV2> {
    const startTime = Date.now();
    const goalId = randomUUID();

    this.logger.log(
      `[PlanningGateway] Creating plan for goal: ${goal.slice(0, 60)}...`,
    );

    try {
      const steps = TaskDecomposer.decompose(goal, needsTool);
      const orderedSteps = Scheduler.order(steps);

      const result: PlanningResultV2 = {
        id: randomUUID(),
        goalId,
        goalDescription: goal,
        steps: orderedSteps,
        estimatedRisk: 'LOW',
        requiresApproval: false,
        plannedAt: new Date(),
      };

      this.logger.log(
        `[PlanningGateway] Plan created in ${Date.now() - startTime}ms. ` +
          `steps=${result.steps.length}`,
      );

      return result;
    } catch (err) {
      this.logger.error(
        `[PlanningGateway] Planning failed: ${(err as Error).message}`,
      );

      // Fallback: direct execution plan.
      return ExecutionPlanBuilder.buildDirectPlan(goalId, goal);
    }
  }
}
