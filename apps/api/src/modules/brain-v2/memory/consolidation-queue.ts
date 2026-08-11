import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BrainV2Event } from '../events/brain.events';

/**
 * ConsolidationTask
 *
 * A unit of post-response memory work to be executed asynchronously.
 */
export interface ConsolidationTask {
  /** Task type determines which memory extractor handles it. */
  type: 'EPISODE' | 'FACT' | 'PREFERENCE' | 'RELATION';

  /** The user whose memory to update. */
  userId: string;

  /** The task payload (memory extractor input). */
  payload: Record<string, unknown>;

  /** Wall-clock time the task was queued. */
  queuedAt: Date;
}

/**
 * ConsolidationQueue
 *
 * An asynchronous queue for post-response memory write operations.
 * Brain V2 never blocks a user response for memory consolidation.
 *
 * Tasks are queued after the response is sent and processed
 * by the Scheduler module in the background.
 *
 * Phase 1: In-memory queue with EventEmitter2 dispatch.
 * Phase 2: Bull/BullMQ queue for durability and retry.
 */
@Injectable()
export class ConsolidationQueue {
  private readonly logger = new Logger(ConsolidationQueue.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Enqueues a memory consolidation task.
   * Emits a MEMORY_CONSOLIDATION_QUEUED event for background processing.
   *
   * @param task - The consolidation task to queue.
   */
  enqueue(task: ConsolidationTask): void {
    this.logger.debug(
      `[ConsolidationQueue] Enqueuing ${task.type} task for user=${task.userId}`,
    );
    this.eventEmitter.emit(BrainV2Event.MEMORY_CONSOLIDATION_QUEUED, task);
  }

  /**
   * Convenience method to enqueue an episode consolidation.
   *
   * @param userId  - The user's ID.
   * @param title   - Episode title.
   * @param summary - Episode summary.
   * @param importance - Importance score (0–100).
   */
  enqueueEpisode(
    userId: string,
    title: string,
    summary: string,
    importance: number,
  ): void {
    this.enqueue({
      type: 'EPISODE',
      userId,
      payload: { title, summary, importance, participants: ['Jarvis'] },
      queuedAt: new Date(),
    });
  }

  /**
   * Convenience method to enqueue a fact consolidation.
   *
   * @param userId   - The user's ID.
   * @param fact     - The fact content.
   * @param category - The fact category.
   */
  enqueueFact(
    userId: string,
    fact: string,
    category: string,
    confidence: number = 85,
  ): void {
    this.enqueue({
      type: 'FACT',
      userId,
      payload: { fact, category, confidence },
      queuedAt: new Date(),
    });
  }
}
