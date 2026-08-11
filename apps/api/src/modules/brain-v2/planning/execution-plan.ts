import type {
  PlanningResultV2,
  PlanStepV2,
} from '../contracts/planning-result';

/**
 * ExecutionPlanBuilder
 *
 * Constructs PlanningResultV2 objects from structured plan inputs.
 * Phase 1: Stub builder used by the Planning Gateway.
 * Phase 2: Driven by LLM plan output parsing.
 */
export class ExecutionPlanBuilder {
  /**
   * Builds a minimal direct-execution plan for IMMEDIATE/MEMORY_RETRIEVAL paths.
   * No actual planning steps — just a single language-generation step.
   *
   * @param goalId          - The goal identifier.
   * @param goalDescription - The user's goal description.
   * @returns A minimal PlanningResultV2.
   */
  static buildDirectPlan(
    goalId: string,
    goalDescription: string,
  ): PlanningResultV2 {
    const step: PlanStepV2 = {
      id: `step_${Date.now()}`,
      name: 'direct_language_generation',
      description: 'Generate a direct language response',
      type: 'language',
      input: { goal: goalDescription },
      dependsOn: [],
      optional: false,
    };

    return {
      id: `plan_${Date.now()}`,
      goalId,
      goalDescription,
      steps: [step],
      estimatedRisk: 'LOW',
      requiresApproval: false,
      plannedAt: new Date(),
    };
  }
}
