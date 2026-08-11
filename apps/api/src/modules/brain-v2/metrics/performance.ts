import { Injectable, Logger } from '@nestjs/common';

/**
 * PerformanceSnapshot
 *
 * A point-in-time performance snapshot for a single metric.
 */
export interface PerformanceSnapshot {
  timestamp: Date;
  value: number;
  label: string;
}

/**
 * PerformanceMetricsService
 *
 * General-purpose performance recorder.
 * Records arbitrary named metrics with timestamps.
 * Used by the Consciousness module's self-monitor for
 * detecting regressions and anomalies.
 */
@Injectable()
export class PerformanceMetricsService {
  private readonly logger = new Logger(PerformanceMetricsService.name);

  private readonly snapshots: Map<string, PerformanceSnapshot[]> = new Map();
  private readonly MAX_SNAPSHOTS_PER_METRIC = 500;

  /**
   * Records a performance snapshot for a named metric.
   *
   * @param label - Metric name (e.g., 'language_generation_ms').
   * @param value - Numeric value.
   */
  record(label: string, value: number): void {
    if (!this.snapshots.has(label)) {
      this.snapshots.set(label, []);
    }

    const bucket = this.snapshots.get(label)!;
    bucket.push({ timestamp: new Date(), value, label });

    if (bucket.length > this.MAX_SNAPSHOTS_PER_METRIC) {
      bucket.shift();
    }

    this.logger.debug(`[Perf] ${label}=${value}`);
  }

  /**
   * Returns the most recent snapshot for a given metric.
   */
  getLatest(label: string): PerformanceSnapshot | undefined {
    const bucket = this.snapshots.get(label);
    return bucket?.[bucket.length - 1];
  }

  /**
   * Returns the average value for a given metric across all samples.
   */
  getAverage(label: string): number {
    const bucket = this.snapshots.get(label);
    if (!bucket || bucket.length === 0) return 0;
    return bucket.reduce((a, b) => a + b.value, 0) / bucket.length;
  }

  /**
   * Returns the p95 value for a given metric.
   * Useful for latency SLA monitoring.
   */
  getP95(label: string): number {
    const bucket = this.snapshots.get(label);
    if (!bucket || bucket.length === 0) return 0;

    const sorted = [...bucket].sort((a, b) => a.value - b.value);
    const idx = Math.floor(sorted.length * 0.95);
    return sorted[idx]?.value ?? 0;
  }

  /**
   * Returns all metric labels being tracked.
   */
  getTrackedMetrics(): string[] {
    return [...this.snapshots.keys()];
  }
}
