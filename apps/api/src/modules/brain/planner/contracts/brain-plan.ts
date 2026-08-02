import { BrainGoal } from './brain-goal';
import { BrainPlanStep } from './brain-plan-step';
import { BrainPlanStatus } from '../enums/brain-plan-status.enum';
import { BrainPlanPriority } from '../enums/brain-plan-priority.enum';
import { BrainPlanContext } from '../types/brain-plan-context.type';

/**
 * Represents a structured sequence of steps required to satisfy a goal.
 */
export interface BrainPlan {
  readonly id: string;
  readonly goalId: string;
  readonly goal: BrainGoal;
  readonly status: BrainPlanStatus;
  readonly priority: BrainPlanPriority;
  readonly steps: ReadonlyArray<BrainPlanStep>;
  readonly context?: BrainPlanContext;
  readonly createdAt: Date;
}
