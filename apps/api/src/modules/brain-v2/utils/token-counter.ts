/**
 * Estimates the number of tokens in a given text string.
 *
 * Uses a heuristic approximation (1 token ≈ 4 characters for English text),
 * which is accurate enough for budget enforcement without requiring a full
 * tokenizer library.
 *
 * For Phase 2, this can be replaced with a proper tokenizer
 * (e.g., tiktoken for OpenAI, or model-specific tokenizer for Ollama).
 *
 * @param text - The text to estimate tokens for.
 * @returns Estimated token count.
 */
export function estimateTokenCount(text: string): number {
  if (!text || text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Truncates text to a maximum token count.
 *
 * Appends a truncation marker when text is shortened.
 *
 * @param text - The text to potentially truncate.
 * @param maxTokens - Maximum allowed token count.
 * @returns Truncated text with marker if needed, or original text.
 */
export function truncateToTokenBudget(
  text: string,
  maxTokens: number,
): { text: string; wasTruncated: boolean } {
  const estimated = estimateTokenCount(text);
  if (estimated <= maxTokens) {
    return { text, wasTruncated: false };
  }

  const maxChars = maxTokens * 4;
  const truncated = text.slice(0, maxChars);
  return {
    text: `${truncated}\n\n[...truncated — input exceeded token budget of ${maxTokens} tokens]`,
    wasTruncated: true,
  };
}

/**
 * Returns the estimated token count of a conversation history array.
 *
 * @param messages - Array of message objects with a 'content' string field.
 * @returns Total estimated token count across all messages.
 */
export function estimateConversationTokens(
  messages: Array<{ content: string }>,
): number {
  return messages.reduce((sum, m) => sum + estimateTokenCount(m.content), 0);
}
