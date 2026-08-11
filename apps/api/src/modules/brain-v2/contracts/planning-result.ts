/**
 * PlanStepV2
 *
 * A single executable step in a V2 cognitive plan.
 */
export interface PlanStepV2 {
  /** Unique identifier for this step. */
  id: string;

  /** Human-readable step name. */
  name: string;

  /** What this step does. */
  description: string;

  /**
   * Type of execution required.
   * 'skill'    → invoke a skill (code, search, shell, etc.)
   * 'reasoning'→ invoke Reasoner for sub-goal analysis
   * 'language' → direct language generation (no tool)
   */
  type: 'skill' | 'reasoning' | 'language';

  /** For type='skill', the name of the skill to invoke. */
  skillName?: string;

  /** Input payload for the step executor. */
  input: Record<string, unknown>;

  /** IDs of steps that must complete before this one can run. */
  dependsOn: string[];

  /** Whether this step can fail without aborting the whole plan. */
  optional: boolean;
}

/**
 * PlanningResultV2
 *
 * V2 adapter over the existing Brain V1 BrainPlan.
 * The Planning Gateway translates V1's plan into this contract.
 */
export interface PlanningResultV2 {
  /** Unique plan identifier. */
  id: string;

  /** Unique goal identifier this plan serves. */
  goalId: string;

  /** The natural-language goal this plan addresses. */
  goalDescription: string;

  /** Ordered list of steps to execute. */
  steps: PlanStepV2[];

  /**
   * Overall estimated risk of executing this plan.
   * CRITICAL plans require explicit user approval before execution.
   */
  estimatedRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  /** True if this plan requires explicit user approval before execution. */
  requiresApproval: boolean;

  /** Wall-clock time the plan was created. */
  plannedAt: Date;
}
