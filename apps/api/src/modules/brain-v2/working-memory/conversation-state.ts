import { Injectable } from '@nestjs/common';
import type {
  ConversationMessage,
  WorkingMemoryState,
} from '../contracts/working-memory';

/**
 * ConversationStateManager
 *
 * Manages the conversation history slice within a WorkingMemoryState.
 * Enforces a bounded window (sliding) to prevent context overflow.
 *
 * This is NOT a persistent conversation store — it only manages
 * the in-memory window for the current cognitive turn.
 * Persistence is handled by the existing ConversationsService.
 */
@Injectable()
export class ConversationStateManager {
  /** Default maximum number of messages to retain in the window. */
  private readonly DEFAULT_WINDOW_SIZE = 10;

  /**
   * Appends a message to the conversation history window.
   * Trims oldest messages if the window exceeds its size limit.
   *
   * @param state   - The current WorkingMemoryState.
   * @param message - The message to append.
   * @param windowSize - Maximum messages to retain (default: 10).
   */
  appendMessage(
    state: WorkingMemoryState,
    message: ConversationMessage,
    windowSize = this.DEFAULT_WINDOW_SIZE,
  ): void {
    state.conversationHistory.push(message);
    if (state.conversationHistory.length > windowSize) {
      // Trim oldest messages from the front.
      state.conversationHistory.splice(
        0,
        state.conversationHistory.length - windowSize,
      );
    }
  }

  /**
   * Returns the conversation history as a formatted string for
   * injection into prompts.
   *
   * @param state - The current WorkingMemoryState.
   * @returns Formatted conversation history string.
   */
  formatHistory(state: WorkingMemoryState): string {
    if (state.conversationHistory.length === 0) return '';

    return state.conversationHistory
      .map((m) => {
        const label =
          m.role === 'user'
            ? 'User'
            : m.role === 'assistant'
              ? 'Jarvis'
              : 'System';
        return `${label}: ${m.content}`;
      })
      .join('\n');
  }

  /**
   * Populates the working memory history from an external message array.
   * Used at the start of each turn to seed working memory from
   * the persistent ConversationsService.
   *
   * @param state    - The WorkingMemoryState to populate.
   * @param messages - Messages from ConversationsService.
   * @param limit    - Maximum messages to load.
   */
  seed(
    state: WorkingMemoryState,
    messages: Array<{ role: string; content: string; createdAt?: Date }>,
    limit = this.DEFAULT_WINDOW_SIZE,
  ): void {
    const recent = messages.slice(-limit);
    state.conversationHistory = recent.map((m) => ({
      role:
        m.role === 'user' || m.role === 'assistant' || m.role === 'system'
          ? m.role
          : 'user',
      content: m.content,
      timestamp: m.createdAt ?? new Date(),
    }));
  }
}
