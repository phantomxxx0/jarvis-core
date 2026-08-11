import { BrainPlan } from '../../planner/contracts/brain-plan';
import { BrainReasoningContext } from '../types/brain-reasoning-context.type';

/**
 * Encapsulates the plan to be reasoned upon along with relevant context.
 */
export interface BrainReasoningRequest {
  readonly id: string;
  readonly plan: BrainPlan;
  readonly context?: BrainReasoningContext;
  readonly requestedAt: Date;
}
