import { Injectable, Logger } from '@nestjs/common';
import type {
  WorkingMemoryState,
  UserIdentity,
} from '../contracts/working-memory';
import type { AttentionResult } from '../contracts/attention-result';
import { ConversationStateManager } from './conversation-state';
import { FocusStackManager } from './focus-stack';
import { COGNITIVE_THRESHOLDS } from '../config/thresholds';

/**
 * WorkingMemoryService
 *
 * The Working Memory's primary service. Creates, manages, and destroys
 * per-session WorkingMemoryState instances.
 *
 * Working Memory is volatile RAM — it holds everything the brain needs
 * while thinking about a single request, then discards it.
 *
 * Key responsibilities:
 *  1. Create a fresh WorkingMemoryState for each cognitive turn.
 *  2. Seed it with conversation history from persistence.
 *  3. Load UserIdentity from long-term memory (when available).
 *  4. Update the state as cognitive modules execute.
 *  5. Expose a snapshot for background tasks before destruction.
 *
 * Scope: Request-scoped conceptually, but implemented as a module-level
 * singleton that creates per-request state objects (to avoid NestJS
 * REQUEST scope complexity with event listeners).
 */
@Injectable()
export class WorkingMemoryService {
  readonly moduleName = 'WorkingMemory';
  private readonly logger = new Logger(WorkingMemoryService.name);

  constructor(
    private readonly conversationState: ConversationStateManager,
    private readonly focusStack: FocusStackManager,
  ) {}

  /** @implements ICognitiveModule */
  isReady(): boolean {
    return true;
  }

  /**
   * Creates a fresh, empty WorkingMemoryState for a new cognitive turn.
   *
   * @param userId    - The user this turn belongs to.
   * @param sessionId - The session this turn belongs to.
   * @returns A clean WorkingMemoryState.
   */
  create(userId: string, sessionId: string): WorkingMemoryState {
    this.logger.debug(
      `[WorkingMemory] Creating state for user=${userId} session=${sessionId}`,
    );

    return {
      userId,
      sessionId,
      conversationHistory: [],
      userIdentity: { facts: {} },
      currentGoal: null,
      focusStack: [],
      retrievedFacts: [],
      toolOutputs: {},
      emotionalState: 'NEUTRAL',
      attentionFocus: null,
      scratch: {},
      initializedAt: new Date(),
    };
  }

  /**
   * Seeds the Working Memory conversation history from an array of
   * messages retrieved from the persistent ConversationsService.
   *
   * @param state    - The WorkingMemoryState to seed.
   * @param messages - Recent messages from persistence.
   * @param limit    - Maximum messages to load.
   */
  seedConversationHistory(
    state: WorkingMemoryState,
    messages: Array<{ role: string; content: string; createdAt?: Date }>,
    limit = 10,
  ): void {
    this.conversationState.seed(state, messages, limit);
    this.logger.debug(
      `[WorkingMemory] Seeded ${state.conversationHistory.length} history messages`,
    );
  }

  /**
   * Loads user identity facts into Working Memory.
   * These are surfaced as first-person facts to the Language Generator.
   *
   * @param state    - The WorkingMemoryState to update.
   * @param identity - UserIdentity from long-term memory.
   */
  loadUserIdentity(
    state: WorkingMemoryState,
    identity: Partial<UserIdentity>,
  ): void {
    state.userIdentity = {
      facts: {},
      ...identity,
    };
  }

  /**
   * Updates Working Memory with the output of the Attention System.
   * Handles topic shift detection and focus stack management.
   *
   * @param state     - The WorkingMemoryState to update.
   * @param attention - The AttentionResult from the Attention System.
   */
  applyAttention(state: WorkingMemoryState, attention: AttentionResult): void {
    state.attentionFocus = attention;
    state.emotionalState = attention.emotion;

    // On topic shift: reset the focus stack with new tags.
    if (attention.novelty >= COGNITIVE_THRESHOLDS.TOPIC_SHIFT_NOVELTY_MIN) {
      this.logger.debug(
        `[WorkingMemory] Topic shift detected (novelty=${attention.novelty}). Resetting focus stack.`,
      );
      this.focusStack.reset(state, attention.topicTags);
    } else {
      // Continuation: push new tags that aren't already on the stack.
      for (const tag of attention.topicTags.slice(0, 2)) {
        if (!state.focusStack.includes(tag)) {
          this.focusStack.push(state, tag);
        }
      }
    }
  }

  /**
   * Stores retrieved memory facts into Working Memory.
   *
   * @param state - The WorkingMemoryState to update.
   * @param facts - Retrieved fact strings from the Memory Gateway.
   */
  setRetrievedFacts(state: WorkingMemoryState, facts: string[]): void {
    state.retrievedFacts = facts;
  }

  /**
   * Stores a tool/skill output in Working Memory.
   *
   * @param state     - The WorkingMemoryState to update.
   * @param skillName - Name of the skill.
   * @param output    - The output to store.
   */
  setToolOutput(
    state: WorkingMemoryState,
    skillName: string,
    output: unknown,
  ): void {
    state.toolOutputs[skillName] = output;
  }

  /**
   * Takes a serializable snapshot of the Working Memory state
   * for consumption by background tasks (reflection, learning)
   * after the response has been sent.
   *
   * @param state - The WorkingMemoryState to snapshot.
   * @returns A deep copy of the state.
   */
  snapshot(state: WorkingMemoryState): WorkingMemoryState {
    return JSON.parse(JSON.stringify(state)) as WorkingMemoryState;
  }
}
