/**
 * Decomposition
 *
 * Goal decomposition helpers used by the Reasoning pipeline
 * to break complex goals into atomic sub-goals.
 *
 * Phase 1: Rule-based splitting by conjunction patterns.
 * Phase 2: LLM-based hierarchical decomposition.
 */

/**
 * Decomposes a compound goal into a list of atomic sub-goals.
 *
 * @param goal - The compound goal string.
 * @returns Array of atomic sub-goal strings.
 */
export function decomposeGoal(goal: string): string[] {
  // Split by common goal conjunction patterns.
  const parts = goal
    .split(
      /\b(?:and\s+then|then|after\s+that|next|also|additionally|furthermore)\b/i,
    )
    .map((p) => p.trim())
    .filter((p) => p.length > 5);

  return parts.length > 1 ? parts : [goal];
}

/**
 * Checks whether a goal string contains multiple distinct tasks.
 *
 * @param goal - The goal to check.
 * @returns true if the goal appears to be compound.
 */
export function isCompoundGoal(goal: string): boolean {
  return decomposeGoal(goal).length > 1;
}
