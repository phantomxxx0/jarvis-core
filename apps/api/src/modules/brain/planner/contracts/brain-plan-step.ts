import { BrainPlanStatus } from '../enums/brain-plan-status.enum';

/**
 * Represents an individual, actionable operation within a plan.
 * Supports nesting and dependencies to enable complex, conditional, or parallel execution.
 */
export interface BrainPlanStep<TAction = unknown, TArgs = unknown> {
  readonly id: string;
  readonly planId: string;
  readonly name: string;
  readonly description?: string;
  readonly action: TAction;
  readonly arguments?: TArgs;
  readonly status: BrainPlanStatus;

  /** IDs of other steps that must complete before this one can begin (enables sequential/parallel graphs). */
  readonly dependencies?: ReadonlyArray<string>;

  /** Indicates if this step executes conditionally. */
  readonly condition?: string;

  /** Nested sub-steps for hierarchical execution scenarios. */
  readonly subSteps?: ReadonlyArray<BrainPlanStep>;
}
