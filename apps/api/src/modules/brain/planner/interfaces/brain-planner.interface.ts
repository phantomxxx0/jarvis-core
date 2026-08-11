import { BrainRequest } from '../../router/contracts/brain-request';
import { BrainGoal } from '../contracts/brain-goal';
import { BrainPlan } from '../contracts/brain-plan';
import { BrainPlanContext } from '../types/brain-plan-context.type';

/**
 * The Brain Planner is strictly responsible for translating requests into goals,
 * and goals into ordered, executable plans. It does not execute the plan itself.
 */
export interface IBrainPlanner {
  /**
   * Derives a structured goal from an incoming BrainRequest.
   */
  formulateGoal<TRequest extends BrainRequest>(
    request: TRequest,
    context?: BrainPlanContext,
  ): Promise<BrainGoal>;

  /**
   * Generates a concrete plan containing steps to achieve the provided goal.
   */
  generatePlan(goal: BrainGoal, context?: BrainPlanContext): Promise<BrainPlan>;
}
