import { z } from 'zod';

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
    capabilityRequired: z.string(),
    output: z.unknown().optional(),
    error: z.string().optional(),
    status: z
      .enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED'])
      .default('PENDING'),
    dependencies: z.array(z.string().uuid()).optional(),
    condition: z.string().optional(),
    subSteps: z.array(BrainPlanStepSchema).optional(),
  }),
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
  arguments?: TArgs;

  capabilityRequired: string;
  output?: unknown;
  error?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

  /** IDs of other steps that must complete before this one can begin (enables sequential/parallel graphs). */
  readonly dependencies?: ReadonlyArray<string>;

  /** Indicates if this step executes conditionally. */
  readonly condition?: string;

  /** Nested sub-steps for hierarchical execution scenarios. */
  readonly subSteps?: ReadonlyArray<BrainPlanStep<TAction, TArgs>>;
}
