import type { AttentionResult, EmotionalValence } from './attention-result';

/**
 * ConversationMessage
 *
 * A single message in the working memory conversation window.
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

/**
 * UserIdentity
 *
 * First-person facts about the user that the Language Generator
 * should treat as its own memory — never as "recalled" information.
 *
 * These are loaded from persistent memory BEFORE language generation.
 * The prompt builder injects them as: "You know that..." facts.
 */
export interface UserIdentity {
  /** User's actual name. */
  name?: string;

  /**
   * Preferred form of address.
   * e.g. "Master Arpan", "Dr. Sharma", "Arpan"
   */
  preferredAddress?: string;

  /** User's detected locale / timezone. */
  locale?: string;

  /** User's preferred language for responses. */
  preferredLanguage?: string;

  /** Any other personal facts keyed by label. */
  facts: Record<string, string>;
}

/**
 * WorkingMemoryState
 *
 * The volatile, per-session cognitive workspace.
 * Exists ONLY while the brain is processing a single request.
 * Think RAM — nothing here is permanently stored.
 *
 * Created fresh at the start of each cognitive cycle.
 * Discarded after BrainOutput is produced.
 * Background tasks (learning, reflection) consume a snapshot before discard.
 */
export interface WorkingMemoryState {
  /** Session this state belongs to. */
  sessionId: string;

  /** User this session belongs to. */
  userId: string;

  /**
   * Recent conversation messages (bounded window).
   * Populated from persistent ConversationsService before each turn.
   */
  conversationHistory: ConversationMessage[];

  /**
   * First-person identity facts loaded from long-term memory.
   * These humanize the Language Generator's output.
   */
  userIdentity: UserIdentity;

  /**
   * The current active goal for this session.
   * May span multiple turns for complex tasks.
   */
  currentGoal: string | null;

  /**
   * Topic focus stack.
   * Top of stack = current topic.
   * Allows nesting (e.g., discussing project X while explaining concept Y).
   */
  focusStack: string[];

  /**
   * Facts retrieved from long-term memory for this turn.
   * Populated by the Memory Gateway when the Executive decides
   * retrieveMemory=true.
   */
  retrievedFacts: string[];

  /**
   * Outputs from tools/skills executed this turn.
   * Key = tool/skill name, value = serialized result.
   */
  toolOutputs: Record<string, unknown>;

  /**
   * Current emotional state detected by the Attention System.
   * Influences Language Generator tone selection.
   */
  emotionalState: EmotionalValence;

  /**
   * The AttentionResult computed for this turn.
   * Carried forward so downstream modules (Language, Reflection)
   * can reference it without recomputing.
   */
  attentionFocus: AttentionResult | null;

  /**
   * Arbitrary transient key-value scratch pad.
   * Used by skills and the reasoning pipeline for intra-turn state.
   */
  scratch: Record<string, unknown>;

  /** Wall-clock time this state was initialized. */
  initializedAt: Date;
}
