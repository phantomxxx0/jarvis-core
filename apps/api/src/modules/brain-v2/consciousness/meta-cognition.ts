import { Injectable, Logger } from '@nestjs/common';
import { SelfMonitor } from './self-monitor';

/**
 * MetaCognition
 *
 * The brain's ability to think about its own thinking.
 * Phase 1: Logs cognitive cycle analysis to support future self-improvement.
 * Phase 2: Feeds insights back to the Learning module.
 */
@Injectable()
export class MetaCognition {
  private readonly logger = new Logger(MetaCognition.name);

  constructor(private readonly selfMonitor: SelfMonitor) {}

  /**
   * Performs a meta-cognitive analysis of the cognitive system.
   * Called periodically by the CognitiveLoop.
   *
   * @returns A summary of the current cognitive state analysis.
   */
  analyze(): {
    healthy: boolean;
    insights: string[];
    recommendations: string[];
  } {
    const state = this.selfMonitor.check();
    const insights: string[] = [];
    const recommendations: string[] = [];
    let healthy = true;

    // Analyze latency patterns.
    const immediateLatency = state.averageLatencyByPath['IMMEDIATE'];
    if (immediateLatency) {
      if (immediateLatency < 300) {
        insights.push(
          `IMMEDIATE path latency is excellent (${immediateLatency.toFixed(0)}ms avg).`,
        );
      } else if (immediateLatency > 800) {
        healthy = false;
        insights.push(
          `IMMEDIATE path latency is degraded (${immediateLatency.toFixed(0)}ms avg).`,
        );
        recommendations.push(
          'Investigate IMMEDIATE path for blocking operations.',
        );
      }
    }

    if (state.backgroundQueueDepth > 20) {
      insights.push(
        `Background queue depth is elevated: ${state.backgroundQueueDepth}.`,
      );
      recommendations.push('Consider increasing background worker capacity.');
    }

    if (insights.length === 0) {
      insights.push('Cognitive system operating normally.');
    }

    this.logger.debug(
      `[MetaCognition] healthy=${healthy} insights=${insights.length} requests=${state.totalRequestsProcessed}`,
    );

    return { healthy, insights, recommendations };
  }
}
