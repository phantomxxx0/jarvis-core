/**
 * LanguageResult
 *
 * The output of the Language Generator. Contains the final natural-language
 * response along with quality metadata.
 *
 * The Language Generator is the ONLY module that calls the LLM.
 * Its sole responsibility is converting CognitiveContext into language.
 * It makes no decisions. It performs no routing.
 */
export interface LanguageResult {
  /**
   * The final, sanitized natural-language response ready to deliver.
   * All LLM artifacts removed (no <think> tags, no JSON blobs,
   * no "Based on previous conversation..." preamble).
   */
  content: string;

  /**
   * The response style applied.
   * Matches the style selected by the Language Generator based on
   * CognitiveContext and EmotionalState.
   */
  styleApplied: 'CONCISE' | 'DETAILED' | 'PLAYFUL' | 'FORMAL' | 'EMPATHETIC';

  /**
   * True if the LLM response passed all validation checks.
   * False if fallback content was substituted.
   */
  isValid: boolean;

  /**
   * True if the Language Generator used a fallback response
   * (e.g., LLM returned empty or invalid output).
   */
  usedFallback: boolean;

  /**
   * Estimated token count of the response.
   * Useful for downstream cost tracking and metrics.
   */
  estimatedTokens: number;

  /** Wall-clock time the Language Generator completed generation. */
  generatedAt: Date;

  /** Latency of the LLM call itself (excluding prompt assembly). */
  llmLatencyMs: number;
}
