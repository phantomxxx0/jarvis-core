import { BrainPlanStatus } from '../enums/brain-plan-status.enum';
import { BrainPlanError } from '../types/brain-plan-error.type';

/**
 * Represents the outcome of generating or executing a plan.
 */
export interface BrainPlanResult<TOutput = unknown> {
  readonly planId: string;
  readonly status: BrainPlanStatus;
  readonly success: boolean;
  readonly output?: TOutput;
  readonly error?: BrainPlanError;
  readonly completedAt: Date;
}
