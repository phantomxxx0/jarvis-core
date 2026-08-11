import type {
  PlanningResultV2,
  PlanStepV2,
} from '../contracts/planning-result';

/**
 * TaskDecomposer
 *
 * Decomposes a complex goal into a sequence of PlanStepV2 entries.
 * Phase 1: Simple sequential step builder.
 * Phase 2: DAG-based dependency-aware decomposition.
 */
export class TaskDecomposer {
  /**
   * Decomposes a reasoning result into ordered plan steps.
   * Currently produces a minimal pipeline: memory → reasoning → skill → language.
   *
   * @param goal           - The goal description.
   * @param needsTool      - Whether a tool/skill invocation is required.
   * @param skillName      - The skill to invoke (if needsTool is true).
   * @returns An array of ordered PlanStepV2 objects.
   */
  static decompose(
    goal: string,
    needsTool: boolean,
    skillName?: string,
  ): PlanStepV2[] {
    const steps: PlanStepV2[] = [];
    let lastId: string | null = null;

    if (needsTool && skillName) {
      const skillStep: PlanStepV2 = {
        id: `step_skill_${Date.now()}`,
        name: `invoke_${skillName}`,
        description: `Invoke the ${skillName} skill`,
        type: 'skill',
        skillName,
        input: { goal },
        dependsOn: lastId ? [lastId] : [],
        optional: false,
      };
      steps.push(skillStep);
      lastId = skillStep.id;
    }

    const langStep: PlanStepV2 = {
      id: `step_lang_${Date.now() + 1}`,
      name: 'language_generation',
      description: 'Generate the final language response',
      type: 'language',
      input: { goal },
      dependsOn: lastId ? [lastId] : [],
      optional: false,
    };
    steps.push(langStep);

    return steps;
  }
}
