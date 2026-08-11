import { Injectable, Logger } from '@nestjs/common';
import { InternalStateTracker } from './internal-state';
import type { CognitiveState } from '../contracts/cognitive-state';

/**
 * SelfMonitor
 *
 * Monitors Brain V2's health and performance.
 * Detects anomalies and logs alerts for operational awareness.
 *
 * Phase 1: Threshold-based alerting.
 * Phase 2: Trend analysis and self-healing triggers.
 */
@Injectable()
export class SelfMonitor {
  private readonly logger = new Logger(SelfMonitor.name);

  /** Alert threshold: average latency (ms) for IMMEDIATE path. */
  private readonly IMMEDIATE_LATENCY_ALERT_MS = 800;

  constructor(private readonly internalState: InternalStateTracker) {}

  /**
   * Runs a health check and logs any anomalies.
   * Called periodically by the Scheduler.
   *
   * @returns The current CognitiveState snapshot.
   */
  check(): CognitiveState {
    const state = this.internalState.getSnapshot();

    // Alert on IMMEDIATE path latency regression.
    const immediateLatency = state.averageLatencyByPath['IMMEDIATE'];
    if (
      immediateLatency &&
      immediateLatency > this.IMMEDIATE_LATENCY_ALERT_MS
    ) {
      this.logger.warn(
        `[SelfMonitor] IMMEDIATE path average latency ${immediateLatency.toFixed(0)}ms ` +
          `exceeds threshold of ${this.IMMEDIATE_LATENCY_ALERT_MS}ms`,
      );
    }

    // Alert on high background queue depth.
    if (state.backgroundQueueDepth > 50) {
      this.logger.warn(
        `[SelfMonitor] Background queue depth is high: ${state.backgroundQueueDepth}`,
      );
    }

    return state;
  }
}
