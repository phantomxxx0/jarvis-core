import { Injectable, Logger } from '@nestjs/common';

/**
 * MemoryMetricsService
 *
 * Tracks memory retrieval performance for observability.
 * Used by the Consciousness module and future dashboards.
 */
@Injectable()
export class MemoryMetricsService {
  private readonly logger = new Logger(MemoryMetricsService.name);

  private totalRetrievals = 0;
  private totalFactsRetrieved = 0;
  private retrivalLatencies: number[] = [];
  private consolidationQueueDepth = 0;

  private readonly MAX_LATENCY_SAMPLES = 100;

  /**
   * Records a completed memory retrieval operation.
   *
   * @param factsCount - Number of facts retrieved.
   * @param latencyMs  - How long retrieval took.
   */
  recordRetrieval(factsCount: number, latencyMs: number): void {
    this.totalRetrievals++;
    this.totalFactsRetrieved += factsCount;

    this.retrivalLatencies.push(latencyMs);
    if (this.retrivalLatencies.length > this.MAX_LATENCY_SAMPLES) {
      this.retrivalLatencies.shift();
    }

    this.logger.debug(
      `[MemoryMetrics] facts=${factsCount} latencyMs=${latencyMs} totalRetrievals=${this.totalRetrievals}`,
    );
  }

  /**
   * Increments the consolidation queue depth counter.
   */
  incrementConsolidationQueue(): void {
    this.consolidationQueueDepth++;
  }

  /**
   * Decrements the consolidation queue depth counter.
   */
  decrementConsolidationQueue(): void {
    this.consolidationQueueDepth = Math.max(
      0,
      this.consolidationQueueDepth - 1,
    );
  }

  /**
   * Returns aggregate memory metrics.
   */
  getSummary(): {
    totalRetrievals: number;
    totalFactsRetrieved: number;
    averageRetrievalLatencyMs: number;
    consolidationQueueDepth: number;
  } {
    const avgLatency =
      this.retrivalLatencies.length > 0
        ? this.retrivalLatencies.reduce((a, b) => a + b, 0) /
          this.retrivalLatencies.length
        : 0;

    return {
      totalRetrievals: this.totalRetrievals,
      totalFactsRetrieved: this.totalFactsRetrieved,
      averageRetrievalLatencyMs: avgLatency,
      consolidationQueueDepth: this.consolidationQueueDepth,
    };
  }
}
