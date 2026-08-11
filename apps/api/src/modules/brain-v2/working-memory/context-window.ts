import { Injectable } from '@nestjs/common';
import {
  estimateTokenCount,
  estimateConversationTokens,
  truncateToTokenBudget,
} from '../utils/token-counter';
import type { WorkingMemoryState } from '../contracts/working-memory';

/**
 * ContextWindow
 *
 * Manages the token budget for the prompt assembled by the Language Generator.
 * Ensures that the assembled context (history + memory + reasoning)
 * fits within the model's context limit.
 *
 * Token budgets (Phase 1, configurable):
 *   Total: 16,000 tokens
 *   ├── System prompt:       ~500 tokens (reserved)
 *   ├── Conversation history: up to 4,000 tokens
 *   ├── Retrieved memory:    up to 3,000 tokens
 *   ├── Reasoning context:   up to 2,000 tokens
 *   ├── Tool outputs:        up to 4,000 tokens
 *   └── User input:          up to 2,500 tokens
 */
@Injectable()
export class ContextWindowManager {
  private readonly TOTAL_BUDGET = 16_000;
  private readonly SYSTEM_RESERVE = 500;
  private readonly HISTORY_BUDGET = 4_000;
  private readonly MEMORY_BUDGET = 3_000;
  private readonly REASONING_BUDGET = 2_000;
  private readonly TOOL_BUDGET = 4_000;
  private readonly INPUT_BUDGET = 2_500;

  /**
   * Returns the remaining token budget for memory injection
   * given the current working memory state.
   *
   * @param state - The current WorkingMemoryState.
   * @returns Remaining memory token budget.
   */
  getMemoryBudget(state: WorkingMemoryState): number {
    const historyTokens = estimateConversationTokens(state.conversationHistory);
    const used =
      this.SYSTEM_RESERVE + Math.min(historyTokens, this.HISTORY_BUDGET);
    return Math.max(
      0,
      this.MEMORY_BUDGET -
        Math.max(0, used - this.SYSTEM_RESERVE - this.HISTORY_BUDGET),
    );
  }

  /**
   * Truncates a memory context string to fit within the memory token budget.
   *
   * @param memoryContext - Raw memory context string from MemoryGateway.
   * @returns Truncated memory context string.
   */
  fitMemoryContext(memoryContext: string): string {
    const { text } = truncateToTokenBudget(memoryContext, this.MEMORY_BUDGET);
    return text;
  }

  /**
   * Truncates a reasoning context string to fit within budget.
   */
  fitReasoningContext(reasoningContext: string): string {
    const { text } = truncateToTokenBudget(
      reasoningContext,
      this.REASONING_BUDGET,
    );
    return text;
  }

  /**
   * Estimates whether the given assembled context is within total budget.
   *
   * @param parts - All context parts to estimate.
   * @returns true if within budget, false if over budget.
   */
  isWithinBudget(parts: string[]): boolean {
    const total = parts.reduce((sum, p) => sum + estimateTokenCount(p), 0);
    return total <= this.TOTAL_BUDGET;
  }
}
