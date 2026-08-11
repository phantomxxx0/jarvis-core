import { Injectable } from '@nestjs/common';
import type { CognitiveState } from '../contracts/cognitive-state';
import type { ExecutionPath } from '../contracts/executive-decision';

/**
 * InternalState
 *
 * The Brain V2 internal state tracked by the Consciousness module.
 * Provides real-time observability into the cognitive system's health.
 */
@Injectable()
export class InternalStateTracker {
  private activeSessions = 0;
  private totalRequestsProcessed = 0;
  private backgroundQueueDepth = 0;
  private lastActivityAt: Date | null = null;

  private latencyAccumulator: Partial<Record<ExecutionPath, number[]>> = {};
  private readonly MAX_SAMPLES = 50;

  /**
   * Called when a new cognitive cycle begins.
   */
  onCycleStart(): void {
    this.activeSessions++;
    this.lastActivityAt = new Date();
  }

  /**
   * Called when a cognitive cycle completes.
   */
  onCycleComplete(path: ExecutionPath, latencyMs: number): void {
    this.activeSessions = Math.max(0, this.activeSessions - 1);
    this.totalRequestsProcessed++;

    if (!this.latencyAccumulator[path]) {
      this.latencyAccumulator[path] = [];
    }
    const bucket = this.latencyAccumulator[path];
    bucket.push(latencyMs);
    if (bucket.length > this.MAX_SAMPLES) bucket.shift();
  }

  /**
   * Increments the background queue depth.
   */
  onBackgroundTaskQueued(): void {
    this.backgroundQueueDepth++;
  }

  /**
   * Decrements the background queue depth.
   */
  onBackgroundTaskCompleted(): void {
    this.backgroundQueueDepth = Math.max(0, this.backgroundQueueDepth - 1);
  }

  /**
   * Returns the current CognitiveState snapshot.
   */
  getSnapshot(): CognitiveState {
    const averageLatencyByPath = {} as Record<ExecutionPath, number>;

    for (const [path, samples] of Object.entries(this.latencyAccumulator)) {
      if (samples && samples.length > 0) {
        averageLatencyByPath[path as ExecutionPath] =
          samples.reduce((a, b) => a + b, 0) / samples.length;
      }
    }

    return {
      activeSessions: this.activeSessions,
      averageLatencyByPath,
      totalRequestsProcessed: this.totalRequestsProcessed,
      backgroundQueueDepth: this.backgroundQueueDepth,
      lastActivityAt: this.lastActivityAt,
    };
  }
}
