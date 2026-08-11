import { Injectable, Logger } from '@nestjs/common';
import type { WorkingMemoryState } from '../contracts/working-memory';
import { ConsolidationQueue } from '../memory/consolidation-queue';

/**
 * LearningGateway (Brain V2)
 *
 * Background-only learning module. NEVER blocks user responses.
 * Routes memory writes through ConsolidationQueue.
 *
 * Called by the Scheduler after BrainOutput is delivered.
 */
@Injectable()
export class LearningGateway {
  readonly moduleName = 'LearningGateway';
  private readonly logger = new Logger(LearningGateway.name);

  constructor(private readonly consolidationQueue: ConsolidationQueue) {}

  /** @implements ICognitiveModule */
  isReady(): boolean {
    return true;
  }

  /**
   * Processes learnings from a completed cognitive cycle.
   * Always called asynchronously. Never throws.
   *
   * @param userId         - The user to learn for.
   * @param goal           - The original user goal.
   * @param response       - The delivered response.
   * @param memorySnapshot - Working Memory snapshot at response time.
   */
  async learn(
    userId: string,
    goal: string,
    response: string,
    memorySnapshot: WorkingMemoryState,
  ): Promise<void> {
    try {
      this.logger.log(
        `[LearningGateway] Starting background learning for user=${userId}`,
      );
      // Queue episode consolidation.
      this.consolidationQueue.enqueueEpisode(
        userId,
        `Interaction: ${goal.slice(0, 80)}`,
        `User asked: "${goal.slice(0, 100)}". Jarvis responded with ${response.length} chars.`,
        50,
      );
      // Extract emotional state as a learnable preference.
      if (memorySnapshot.emotionalState !== 'NEUTRAL') {
        this.consolidationQueue.enqueueFact(
          userId,
          `User exhibited ${memorySnapshot.emotionalState} emotion during this interaction.`,
          'EMOTIONAL_PATTERN',
          70,
        );
      }
      this.logger.log(
        `[LearningGateway] Learning tasks queued for user=${userId}`,
      );
    } catch (err) {
      // Learning failures must never propagate.
      this.logger.error(
        `[LearningGateway] Failed silently: ${(err as Error).message}`,
      );
    }
  }
}
