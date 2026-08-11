import type { PlanStepV2 } from '../contracts/planning-result';

/**
 * Scheduler
 *
 * Orders PlanStepV2 entries by dependency graph to produce
 * a valid execution sequence.
 *
 * Phase 1: Simple topological sort.
 * Phase 2: Parallel DAG execution with dependency tracking.
 */
export class Scheduler {
  /**
   * Sorts plan steps topologically (dependencies before dependents).
   *
   * @param steps - Unordered plan steps.
   * @returns Steps in dependency-safe execution order.
   */
  static order(steps: PlanStepV2[]): PlanStepV2[] {
    const stepMap = new Map<string, PlanStepV2>(steps.map((s) => [s.id, s]));
    const visited = new Set<string>();
    const ordered: PlanStepV2[] = [];

    const visit = (id: string): void => {
      if (visited.has(id)) return;
      visited.add(id);

      const step = stepMap.get(id);
      if (!step) return;

      for (const dep of step.dependsOn) {
        visit(dep);
      }

      ordered.push(step);
    };

    for (const step of steps) {
      visit(step.id);
    }

    return ordered;
  }
}
