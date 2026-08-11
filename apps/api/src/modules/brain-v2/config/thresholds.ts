/**
 * CognitiveThresholds
 *
 * Scoring thresholds used by the Attention System and Executive Controller
 * to classify and route cognitive load.
 *
 * All values are in the 0–100 range unless otherwise noted.
 */
export const COGNITIVE_THRESHOLDS = {
  /**
   * Importance score below which a request is considered trivial
   * and routed to IMMEDIATE execution (no memory/reasoning).
   */
  TRIVIAL_IMPORTANCE_MAX: 15,

  /**
   * Importance score above which memory retrieval is activated.
   */
  MEMORY_RETRIEVAL_IMPORTANCE_MIN: 30,

  /**
   * Importance score above which the Reasoner is considered.
   */
  REASONING_IMPORTANCE_MIN: 60,

  /**
   * Novelty score above which the full context window is refreshed
   * from long-term memory (topic shift detected).
   */
  TOPIC_SHIFT_NOVELTY_MIN: 70,

  /**
   * Urgency score above which the system skips optional modules
   * (reflection, learning scheduling) to meet latency budget.
   */
  HIGH_URGENCY_MIN: 80,

  /**
   * Intent confidence (0.0–1.0) below which the Executive
   * applies conservative (MEMORY_RETRIEVAL) routing as a safe default.
   */
  LOW_CONFIDENCE_THRESHOLD: 0.55,

  /**
   * Salience score above which a memory fact is considered
   * highly relevant and surfaced to the Language Generator.
   */
  HIGH_SALIENCE_FACT_MIN: 75,
} as const;

export type CognitiveThresholds = typeof COGNITIVE_THRESHOLDS;
