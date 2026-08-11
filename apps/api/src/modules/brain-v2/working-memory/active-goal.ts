import { Injectable } from '@nestjs/common';
import type { WorkingMemoryState } from '../contracts/working-memory';

/**
 * ActiveGoalTracker
 *
 * Tracks the current active goal within a WorkingMemoryState.
 * A goal may span multiple conversation turns for complex tasks.
 *
 * The goal is reset when:
 *   - A new high-novelty input arrives (topic shift detected)
 *   - The previous goal was explicitly completed
 *   - The session ends
 */
@Injectable()
export class ActiveGoalTracker {
  /**
   * Sets the current active goal in Working Memory.
   *
   * @param state - The WorkingMemoryState to update.
   * @param goal  - The goal description.
   */
  setGoal(state: WorkingMemoryState, goal: string): void {
    state.currentGoal = goal;
  }

  /**
   * Clears the active goal (called on successful completion or topic shift).
   *
   * @param state - The WorkingMemoryState to update.
   */
  clearGoal(state: WorkingMemoryState): void {
    state.currentGoal = null;
  }

  /**
   * Returns the current active goal, or null if no goal is active.
   *
   * @param state - The WorkingMemoryState to read.
   * @returns The current goal string or null.
   */
  getGoal(state: WorkingMemoryState): string | null {
    return state.currentGoal;
  }

  /**
   * Returns true if there is an active multi-turn goal in progress.
   */
  hasActiveGoal(state: WorkingMemoryState): boolean {
    return state.currentGoal !== null;
  }
}
