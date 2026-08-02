import { BrainPlanPriority } from '../enums/brain-plan-priority.enum';
import { BrainPlanStatus } from '../enums/brain-plan-status.enum';

/**
 * Represents the fundamental objective derived from a BrainRequest.
 */
export interface BrainGoal<TParameters = unknown> {
  readonly id: string;
  readonly requestId: string;
  readonly intent: string;
  readonly description: string;
  readonly priority: BrainPlanPriority;
  readonly status: BrainPlanStatus;
  readonly parameters?: TParameters;
  readonly constraints?: ReadonlyArray<string>;
  readonly createdAt: Date;
}
