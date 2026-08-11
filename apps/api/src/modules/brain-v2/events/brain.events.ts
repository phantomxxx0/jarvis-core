/**
 * BrainV2Event
 *
 * Canonical event names for all events emitted by Brain V2 modules.
 * Used with NestJS EventEmitter2 (@nestjs/event-emitter).
 *
 * Convention: 'brain-v2.<module>.<action>'
 *
 * Brain V2 events are namespaced separately from Brain V1 events
 * to prevent cross-contamination during the parallel operation period.
 */
export enum BrainV2Event {
  // ─── Perception ────────────────────────────────────────────────────────────
  /** Fired when raw input has been fully normalized by the Perception Layer. */
  INPUT_PERCEIVED = 'brain-v2.perception.input-perceived',

  /** Fired when input validation fails (empty, too long, malformed). */
  INPUT_INVALID = 'brain-v2.perception.input-invalid',

  // ─── Attention ─────────────────────────────────────────────────────────────
  /** Fired when the Attention System has computed its signals. */
  ATTENTION_COMPUTED = 'brain-v2.attention.computed',

  /** Fired when a topic shift is detected (novelty > threshold). */
  TOPIC_SHIFT_DETECTED = 'brain-v2.attention.topic-shift',

  // ─── Working Memory ─────────────────────────────────────────────────────────
  /** Fired when a Working Memory state is initialized for a session. */
  WORKING_MEMORY_INITIALIZED = 'brain-v2.working-memory.initialized',

  /** Fired when Working Memory is cleared after a cognitive cycle. */
  WORKING_MEMORY_CLEARED = 'brain-v2.working-memory.cleared',

  // ─── Executive ─────────────────────────────────────────────────────────────
  /** Fired when the Executive has produced its routing decision. */
  EXECUTIVE_DECISION_MADE = 'brain-v2.executive.decision-made',

  // ─── Memory Gateway ─────────────────────────────────────────────────────────
  /** Fired when long-term memory retrieval begins. */
  MEMORY_RETRIEVAL_STARTED = 'brain-v2.memory.retrieval-started',

  /** Fired when long-term memory retrieval completes. */
  MEMORY_RETRIEVAL_COMPLETED = 'brain-v2.memory.retrieval-completed',

  /** Fired when a memory consolidation is queued for background processing. */
  MEMORY_CONSOLIDATION_QUEUED = 'brain-v2.memory.consolidation-queued',

  // ─── Reasoning ─────────────────────────────────────────────────────────────
  /** Fired when Reasoning is invoked. */
  REASONING_STARTED = 'brain-v2.reasoning.started',

  /** Fired when Reasoning completes. */
  REASONING_COMPLETED = 'brain-v2.reasoning.completed',

  // ─── Planning ──────────────────────────────────────────────────────────────
  /** Fired when Planning is invoked. */
  PLANNING_STARTED = 'brain-v2.planning.started',

  /** Fired when Planning completes. */
  PLANNING_COMPLETED = 'brain-v2.planning.completed',

  // ─── Skills ────────────────────────────────────────────────────────────────
  /** Fired when a skill is invoked. */
  SKILL_INVOKED = 'brain-v2.skills.invoked',

  /** Fired when a skill completes successfully. */
  SKILL_COMPLETED = 'brain-v2.skills.completed',

  /** Fired when a skill fails. */
  SKILL_FAILED = 'brain-v2.skills.failed',

  // ─── Language ──────────────────────────────────────────────────────────────
  /** Fired when language generation starts. */
  LANGUAGE_GENERATION_STARTED = 'brain-v2.language.generation-started',

  /** Fired when language generation completes. */
  LANGUAGE_GENERATION_COMPLETED = 'brain-v2.language.generation-completed',

  // ─── Reflection (async) ────────────────────────────────────────────────────
  /** Fired when a background reflection task is scheduled. */
  REFLECTION_SCHEDULED = 'brain-v2.reflection.scheduled',

  /** Fired when background reflection completes. */
  REFLECTION_COMPLETED = 'brain-v2.reflection.completed',

  // ─── Learning (async) ──────────────────────────────────────────────────────
  /** Fired when a background learning task is scheduled. */
  LEARNING_SCHEDULED = 'brain-v2.learning.scheduled',

  /** Fired when background learning completes. */
  LEARNING_COMPLETED = 'brain-v2.learning.completed',

  // ─── Response ──────────────────────────────────────────────────────────────
  /** Fired when a BrainOutput is ready to be returned to the caller. */
  RESPONSE_READY = 'brain-v2.response.ready',

  /** Fired when any unhandled error occurs in the cognitive pipeline. */
  COGNITIVE_ERROR = 'brain-v2.cognitive.error',
}
