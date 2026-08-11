import { Injectable, Logger } from '@nestjs/common';
import type { ExecutiveDecision } from '../contracts/executive-decision';
import type { AttentionResult } from '../contracts/attention-result';

/**
 * CognitionTracker
 *
 * Records cognitive decision patterns over time.
 * Used by the Consciousness module to detect anomalies and by the
 * Learning module to identify areas for improvement.
 */
@Injectable()
export class CognitionTracker {
  private readonly logger = new Logger(CognitionTracker.name);

  /** Map of intent class → count of occurrences. */
  private intentDistribution: Map<string, number> = new Map();

  /** Map of execution path → count of selections. */
  private pathDistribution: Map<string, number> = new Map();

  /** Rolling list of last N confidence scores for trend analysis. */
  private confidenceHistory: number[] = [];

  private readonly MAX_CONFIDENCE_HISTORY = 200;

  /**
   * Records a completed Executive decision for pattern tracking.
   *
   * @param attention  - The AttentionResult that drove the decision.
   * @param decision   - The ExecutiveDecision that was produced.
   */
  record(attention: AttentionResult, decision: ExecutiveDecision): void {
    // Track intent distribution
    const intentCount = this.intentDistribution.get(attention.intent) ?? 0;
    this.intentDistribution.set(attention.intent, intentCount + 1);

    // Track path distribution
    const pathCount = this.pathDistribution.get(decision.executionPath) ?? 0;
    this.pathDistribution.set(decision.executionPath, pathCount + 1);

    // Track confidence trend
    this.confidenceHistory.push(decision.confidence);
    if (this.confidenceHistory.length > this.MAX_CONFIDENCE_HISTORY) {
      this.confidenceHistory.shift();
    }

    this.logger.debug(
      `[CognitionTracker] intent=${attention.intent} path=${decision.executionPath} confidence=${decision.confidence.toFixed(2)}`,
    );
  }

  /**
   * Returns the distribution of intent classes seen.
   */
  getIntentDistribution(): Record<string, number> {
    return Object.fromEntries(this.intentDistribution);
  }

  /**
   * Returns the distribution of execution paths selected.
   */
  getPathDistribution(): Record<string, number> {
    return Object.fromEntries(this.pathDistribution);
  }

  /**
   * Returns the average confidence of recent Executive decisions.
   */
  getAverageConfidence(): number {
    if (this.confidenceHistory.length === 0) return 0;
    return (
      this.confidenceHistory.reduce((a, b) => a + b, 0) /
      this.confidenceHistory.length
    );
  }
}
