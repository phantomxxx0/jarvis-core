import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BrainV2Event } from '../events/brain.events';
import { InternalStateTracker } from '../consciousness/internal-state';

/**
 * BackgroundTask
 *
 * A generic background task wrapper.
 */
export interface BackgroundTask {
  id: string;
  name: string;
  execute: () => Promise<void>;
  queuedAt: Date;
}

/**
 * SchedulerService (Brain V2)
 *
 * Manages the background execution of non-blocking cognitive tasks
 * (e.g., Reflection, Learning, Memory Consolidation).
 *
 * Phase 1: Simple in-memory async queue with concurrency limits.
 * Phase 2: Distributed job queue (BullMQ/Redis).
 */
@Injectable()
export class SchedulerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(SchedulerService.name);
  private readonly queue: BackgroundTask[] = [];
  private isProcessing = false;
  private isShuttingDown = false;

  // Phase 1 concurrency limit
  private readonly CONCURRENCY_LIMIT = 2;
  private activeTasks = 0;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly internalState: InternalStateTracker,
  ) {}

  onApplicationBootstrap(): void {
    this.logger.log('SchedulerService initialized.');
  }

  onApplicationShutdown(): void {
    this.logger.log(
      'SchedulerService shutting down. Stopping queue processing.',
    );
    this.isShuttingDown = true;
  }

  /**
   * Enqueues a background task for asynchronous execution.
   *
   * @param name    - Human readable name for the task.
   * @param execute - The async function to execute.
   */
  enqueue(name: string, execute: () => Promise<void>): void {
    if (this.isShuttingDown) {
      this.logger.warn(
        `[Scheduler] Cannot enqueue task '${name}' while shutting down.`,
      );
      return;
    }

    const task: BackgroundTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      execute,
      queuedAt: new Date(),
    };

    this.queue.push(task);
    this.internalState.onBackgroundTaskQueued();

    this.logger.debug(
      `[Scheduler] Enqueued task '${name}' (Queue depth: ${this.queue.length})`,
    );

    // Fire and forget processing trigger
    this.processQueue().catch((err) => {
      this.logger.error(
        `[Scheduler] Queue processing error: ${(err as Error).message}`,
      );
    });
  }

  /**
   * Processes the queue respecting concurrency limits.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.isShuttingDown) return;
    if (this.queue.length === 0) return;
    if (this.activeTasks >= this.CONCURRENCY_LIMIT) return;

    this.isProcessing = true;

    try {
      while (
        this.queue.length > 0 &&
        this.activeTasks < this.CONCURRENCY_LIMIT &&
        !this.isShuttingDown
      ) {
        const task = this.queue.shift();
        if (!task) break;

        this.activeTasks++;

        // Execute task in background without awaiting the entire queue loop
        this.executeTask(task).finally(() => {
          this.activeTasks--;
          this.internalState.onBackgroundTaskCompleted();

          // Trigger processing again to pick up any pending tasks
          if (this.queue.length > 0 && !this.isShuttingDown) {
            this.processQueue().catch(() => {}); // fire and forget
          }
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Executes a single background task with error isolation.
   */
  private async executeTask(task: BackgroundTask): Promise<void> {
    const startTime = Date.now();
    try {
      this.logger.debug(
        `[Scheduler] Executing task '${task.name}' (${task.id})`,
      );
      await task.execute();
      this.logger.debug(
        `[Scheduler] Task '${task.name}' completed in ${Date.now() - startTime}ms`,
      );
    } catch (error) {
      this.logger.error(
        `[Scheduler] Task '${task.name}' (${task.id}) failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // Background task failures never crash the app.
    }
  }
}
