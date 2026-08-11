/**
 * IntentClass
 *
 * High-level intent categories understood by Brain V2.
 * Kept deliberately coarse — the Executive refines routing from here.
 *
 * Designed to support future modalities (VISION_QUERY, ROBOTICS_COMMAND).
 */
export type IntentClass =
  | 'GREETING' // "Hello", "Good morning", small talk
  | 'FAREWELL' // "Goodbye", "See you"
  | 'QUESTION' // Factual or personal question
  | 'COMMAND' // Imperative: "Do X", "Run Y"
  | 'CREATIVE' // Story, poem, brainstorm
  | 'TECHNICAL' // Code, architecture, debugging
  | 'RESEARCH' // Deep information retrieval
  | 'EMOTIONAL' // Venting, support-seeking
  | 'CLARIFICATION' // Follow-up or disambiguation
  | 'VISION_QUERY' // Image understanding (Phase 3)
  | 'ROBOTICS_COMMAND' // Physical action command (Phase 4)
  | 'SYSTEM' // Internal system operation
  | 'UNKNOWN'; // Could not classify

/**
 * EmotionalValence
 *
 * Detected emotional tone of the user's input.
 */
export type EmotionalValence =
  | 'NEUTRAL'
  | 'POSITIVE'
  | 'NEGATIVE'
  | 'DISTRESSED'
  | 'EXCITED'
  | 'FRUSTRATED'
  | 'UNKNOWN';

/**
 * AttentionResult
 *
 * The output of the Attention System. Represents cognitive signals computed
 * from the PerceptionResult. Used by the Executive Controller to decide which
 * cognitive modules to activate.
 *
 * No LLM is called here in Phase 1. All signals are rule-based.
 * Phase 2 will optionally enhance with a lightweight classifier call.
 */
export interface AttentionResult {
  /**
   * Overall importance of this input.
   * 0 = trivial (e.g. "ok"), 100 = critical (e.g. emergency).
   */
  importance: number;

  /**
   * Urgency of this input.
   * 0 = can be deferred, 100 = requires immediate response.
   */
  urgency: number;

  /** Classified intent type. */
  intent: IntentClass;

  /**
   * Confidence in the intent classification (0.0 – 1.0).
   * Low confidence → Executive should apply conservative routing.
   */
  intentConfidence: number;

  /** Detected emotional valence of the user's input. */
  emotion: EmotionalValence;

  /**
   * Novelty score (0 – 100).
   * 0 = continuation of existing topic, 100 = entirely new topic.
   */
  novelty: number;

  /**
   * Extracted topic tags from the input.
   * Used by Memory Gateway to scope retrieval.
   */
  topicTags: string[];

  /**
   * True if this input appears to be a continuation of the previous turn.
   * False if a topic shift was detected.
   */
  isContinuation: boolean;

  /** Wall-clock time the Attention System completed analysis. */
  analyzedAt: Date;
}
