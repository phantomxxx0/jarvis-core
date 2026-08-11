import { Injectable } from '@nestjs/common';
import type { WorkingMemoryState } from '../contracts/working-memory';

/**
 * ToolResultsStore
 *
 * Manages transient tool/skill outputs within a WorkingMemoryState.
 * Stores results keyed by skill name for the current cognitive turn.
 * All stored results are cleared when Working Memory is destroyed.
 */
@Injectable()
export class ToolResultsStore {
  /**
   * Stores the output of a tool/skill invocation.
   *
   * @param state      - The WorkingMemoryState to update.
   * @param skillName  - The name of the skill that produced the result.
   * @param output     - The output to store.
   */
  set(state: WorkingMemoryState, skillName: string, output: unknown): void {
    state.toolOutputs[skillName] = output;
  }

  /**
   * Retrieves a stored tool output.
   *
   * @param state     - The WorkingMemoryState to read.
   * @param skillName - The skill name whose output to retrieve.
   * @returns The stored output or undefined if not found.
   */
  get(state: WorkingMemoryState, skillName: string): unknown {
    return state.toolOutputs[skillName];
  }

  /**
   * Returns a formatted string of all tool outputs for prompt injection.
   *
   * @param state - The WorkingMemoryState to read.
   * @returns Formatted tool output string.
   */
  formatAll(state: WorkingMemoryState): string {
    const entries = Object.entries(state.toolOutputs);
    if (entries.length === 0) return '';

    return entries
      .map(([name, output]) => {
        const text =
          typeof output === 'string' ? output : JSON.stringify(output, null, 2);
        return `[Tool: ${name}]\n${text}`;
      })
      .join('\n\n');
  }

  /**
   * Clears all stored tool outputs.
   */
  clear(state: WorkingMemoryState): void {
    state.toolOutputs = {};
  }

  /**
   * Returns true if any tool outputs have been stored.
   */
  hasResults(state: WorkingMemoryState): boolean {
    return Object.keys(state.toolOutputs).length > 0;
  }
}
