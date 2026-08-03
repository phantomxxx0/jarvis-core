import { z } from 'zod';
import { BrainPlanStatus } from '../enums/brain-plan-status.enum';

/**
 * Zod schema for runtime validation of LLM-generated plan steps.
 * Uses z.lazy() to support recursive subSteps for hierarchical execution.
 */
export const BrainPlanStepSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().uuid(),
    planId: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    action: z.unknown(), // Accommodates the TAction generic
    arguments: z.unknown().optional(), // Accommodates the TArgs generic
    status: z.nativeEnum(BrainPlanStatus).default(BrainPlanStatus.DRAFT),
    dependencies: z.array(z.string().uuid()).optional(),
    condition: z.string().optional(),
    subSteps: z.array(BrainPlanStepSchema).optional(),
  })
);

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
  readonly subSteps?: ReadonlyArray<BrainPlanStep<TAction, TArgs>>;
}