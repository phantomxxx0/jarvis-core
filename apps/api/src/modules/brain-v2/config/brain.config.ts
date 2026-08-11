import type { ExecutionPath } from '../contracts/executive-decision';

/**
 * BrainV2Config
 *
 * Root configuration for the Brain V2 cognitive operating system.
 * All values have sensible defaults but can be overridden via
 * environment variables or the NestJS ConfigService.
 *
 * Designed to be loaded once at module initialization.
 */
export interface BrainV2Config {
  /**
   * Maximum number of characters allowed in raw input before truncation.
   * Default: 32000 (approximately 8k tokens)
   */
  maxInputChars: number;

  /**
   * Number of recent conversation messages to load into Working Memory
   * at the start of each turn.
   * Default: 10
   */
  conversationHistoryWindow: number;

  /**
   * Maximum number of long-term memory facts to retrieve per turn.
   * Default: 20
   */
  maxMemoryFacts: number;

  /**
   * Maximum number of autonomous reasoning/planning loops
   * before the system gives up on a goal.
   * Default: 3
   */
  maxCognitiveLoops: number;

  /**
   * Minimum intent confidence threshold (0.0 – 1.0) for the
   * Executive to trust the Attention System's classification.
   * Below this, the Executive applies conservative routing.
   * Default: 0.6
   */
  minIntentConfidence: number;

  /**
   * Whether Brain V2 is enabled. When false, all requests
   * fall through to Brain V1 (if wired).
   * Default: true
   */
  enabled: boolean;

  /**
   * The name of the LLM provider to use for language generation.
   * Must match a registered InferenceProviderType.
   * Default: 'OLLAMA'
   */
  inferenceProvider: string;

  /**
   * Latency budgets per execution path in milliseconds.
   * Used by CognitiveBudget to enforce performance targets.
   */
  latencyBudgets: Record<ExecutionPath, number>;
}

/**
 * Default Brain V2 configuration.
 * These values represent the performance targets defined in the spec.
 */
export const DEFAULT_BRAIN_V2_CONFIG: BrainV2Config = {
  maxInputChars: 32_000,
  conversationHistoryWindow: 10,
  maxMemoryFacts: 20,
  maxCognitiveLoops: 3,
  minIntentConfidence: 0.6,
  enabled: true,
  inferenceProvider: 'OLLAMA',
  latencyBudgets: {
    IMMEDIATE: 500,
    MEMORY_RETRIEVAL: 1_000,
    REASONING: 5_000,
    PLANNING: 10_000,
    TOOL_USE: 15_000,
    FULL_COGNITIVE: 30_000,
  },
};
