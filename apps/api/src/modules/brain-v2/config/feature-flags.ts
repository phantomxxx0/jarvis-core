/**
 * BrainV2FeatureFlags
 *
 * Runtime feature flags for gradual rollout of Brain V2 capabilities.
 * Each flag can be controlled via environment variables or a future
 * feature-flag service without code changes.
 *
 * Phase 1: All flags here reflect the Phase 1 skeleton capabilities.
 * Phase 2+: New flags will be added as each capability is wired up.
 */
export interface BrainV2FeatureFlags {
  /**
   * Master switch — enables Brain V2 to process requests.
   * When false, BrainV2Service immediately returns a not-implemented response.
   * Env: BRAIN_V2_ENABLED
   */
  readonly enabled: boolean;

  /**
   * Enables the LLM-enhanced Attention classifier.
   * When false, Attention uses rule-based classification only (Phase 1 default).
   * Env: BRAIN_V2_LLM_ATTENTION
   */
  readonly llmAttention: boolean;

  /**
   * Enables long-term memory retrieval via the Memory Gateway.
   * When false, Working Memory is populated from conversation history only.
   * Env: BRAIN_V2_MEMORY_RETRIEVAL
   */
  readonly memoryRetrieval: boolean;

  /**
   * Enables the Reasoning Gateway (V1 ReasonerService adapter).
   * When false, REASONING path falls back to MEMORY_RETRIEVAL.
   * Env: BRAIN_V2_REASONING
   */
  readonly reasoning: boolean;

  /**
   * Enables the Planning Gateway (V1 PlannerService adapter).
   * When false, PLANNING path falls back to REASONING.
   * Env: BRAIN_V2_PLANNING
   */
  readonly planning: boolean;

  /**
   * Enables asynchronous background reflection.
   * When false, reflection is silently skipped.
   * Env: BRAIN_V2_REFLECTION
   */
  readonly backgroundReflection: boolean;

  /**
   * Enables asynchronous background learning.
   * When false, learning is silently skipped.
   * Env: BRAIN_V2_LEARNING
   */
  readonly backgroundLearning: boolean;

  /**
   * Enables the Consciousness self-monitor loop.
   * When false, internal state is not tracked.
   * Env: BRAIN_V2_CONSCIOUSNESS
   */
  readonly consciousness: boolean;

  /**
   * Enables detailed cognitive trace output in responses.
   * Should be false in production unless debugging.
   * Env: BRAIN_V2_VERBOSE_TRACE
   */
  readonly verboseTrace: boolean;
}

/**
 * Phase 1 default feature flags.
 * Only the core pipeline (Perception → Attention → Executive → Language) is active.
 * All optional subsystems are disabled until wired in Phase 2+.
 */
export const DEFAULT_FEATURE_FLAGS: BrainV2FeatureFlags = {
  enabled: true,
  llmAttention: false,
  memoryRetrieval: false,
  reasoning: false,
  planning: false,
  backgroundReflection: false,
  backgroundLearning: false,
  consciousness: false,
  verboseTrace: false,
};
