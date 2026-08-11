import { Injectable } from '@nestjs/common';
import type { WorkingMemoryState } from '../contracts/working-memory';

/**
 * TransientMemory
 *
 * An arbitrary key-value scratch pad within WorkingMemoryState.
 * Used by skills, the Reasoning pipeline, and the Executive to
 * store intermediate values during a single cognitive turn.
 *
 * All values are cleared when Working Memory is destroyed after the turn.
 * This is NOT a cache — it is a cognitive scratchpad.
 */
@Injectable()
export class TransientMemory {
  /**
   * Sets a value in the transient scratch pad.
   *
   * @param state - The WorkingMemoryState to update.
   * @param key   - The key to set.
   * @param value - The value to store.
   */
  set(state: WorkingMemoryState, key: string, value: unknown): void {
    state.scratch[key] = value;
  }

  /**
   * Retrieves a value from the scratch pad.
   *
   * @param state - The WorkingMemoryState to read.
   * @param key   - The key to retrieve.
   * @returns The stored value or undefined.
   */
  get(state: WorkingMemoryState, key: string): unknown {
    return state.scratch[key];
  }

  /**
   * Returns true if a key exists in the scratch pad.
   */
  has(state: WorkingMemoryState, key: string): boolean {
    return key in state.scratch;
  }

  /**
   * Removes a key from the scratch pad.
   */
  delete(state: WorkingMemoryState, key: string): void {
    delete state.scratch[key];
  }

  /**
   * Clears all scratch pad entries.
   */
  clear(state: WorkingMemoryState): void {
    state.scratch = {};
  }

  /**
   * Returns all scratch pad keys.
   */
  keys(state: WorkingMemoryState): string[] {
    return Object.keys(state.scratch);
  }
}
