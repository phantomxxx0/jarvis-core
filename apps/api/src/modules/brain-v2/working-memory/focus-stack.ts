import { Injectable } from '@nestjs/common';
import type { WorkingMemoryState } from '../contracts/working-memory';

/**
 * FocusStackManager
 *
 * Manages the topic focus stack within a WorkingMemoryState.
 * The focus stack models nested topic context (like a call stack for attention).
 *
 * Examples:
 *   push('TypeScript')         → stack: ['TypeScript']
 *   push('NestJS')             → stack: ['TypeScript', 'NestJS']
 *   pop()                      → stack: ['TypeScript']  (NestJS resolved)
 *   push('Decorators')         → stack: ['TypeScript', 'Decorators']
 *
 * The top of the stack is always the current focus topic.
 * Used by the Memory Gateway to scope retrieval queries.
 */
@Injectable()
export class FocusStackManager {
  private readonly MAX_STACK_DEPTH = 5;

  /**
   * Pushes a new topic onto the focus stack.
   * If the stack is at max depth, the oldest item is dropped.
   *
   * @param state - The WorkingMemoryState to update.
   * @param topic - The topic to push.
   */
  push(state: WorkingMemoryState, topic: string): void {
    if (state.focusStack.length >= this.MAX_STACK_DEPTH) {
      state.focusStack.shift(); // Drop oldest
    }
    state.focusStack.push(topic);
  }

  /**
   * Pops the top topic from the focus stack.
   *
   * @param state - The WorkingMemoryState to update.
   * @returns The popped topic, or undefined if stack is empty.
   */
  pop(state: WorkingMemoryState): string | undefined {
    return state.focusStack.pop();
  }

  /**
   * Returns the current focus topic (top of stack).
   *
   * @param state - The WorkingMemoryState to read.
   * @returns The current focus topic, or null if stack is empty.
   */
  current(state: WorkingMemoryState): string | null {
    return state.focusStack[state.focusStack.length - 1] ?? null;
  }

  /**
   * Sets the entire focus stack from an array of topic tags.
   * Used when the Attention System detects a topic shift (novelty > threshold).
   *
   * @param state  - The WorkingMemoryState to update.
   * @param topics - New topic tags from AttentionResult.
   */
  reset(state: WorkingMemoryState, topics: string[]): void {
    state.focusStack = topics.slice(0, this.MAX_STACK_DEPTH);
  }

  /**
   * Returns all topics currently in the focus stack.
   */
  all(state: WorkingMemoryState): string[] {
    return [...state.focusStack];
  }
}
