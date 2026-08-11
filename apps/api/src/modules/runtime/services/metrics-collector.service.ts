import { Injectable, Logger } from '@nestjs/common';

export interface RollingMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
}

@Injectable()
export class MetricsCollectorService {
  private readonly logger = new Logger(MetricsCollectorService.name);

  // Stores the last 100 latency records per provider for sliding window calculation
  private readonly latencyWindow = new Map<string, number[]>();

  // Stores absolute execution counts per provider
  private readonly executionCounts = new Map<
    string,
    { success: number; failure: number }
  >();

  public recordExecution(
    providerId: string,
    success: boolean,
    latencyMs: number,
  ): void {
    // Update latency window
    if (!this.latencyWindow.has(providerId)) {
      this.latencyWindow.set(providerId, []);
    }
    const window = this.latencyWindow.get(providerId)!;
    window.push(latencyMs);
    if (window.length > 100) {
      window.shift();
    }

    // Update counts
    if (!this.executionCounts.has(providerId)) {
      this.executionCounts.set(providerId, { success: 0, failure: 0 });
    }
    const counts = this.executionCounts.get(providerId)!;
    if (success) {
      counts.success++;
    } else {
      counts.failure++;
    }
  }

  public getMetrics(providerId: string): RollingMetrics {
    const window = this.latencyWindow.get(providerId) || [];
    const counts = this.executionCounts.get(providerId) || {
      success: 0,
      failure: 0,
    };
    const total = counts.success + counts.failure;

    let p50 = 0;
    let p95 = 0;
    let avg = 0;

    if (window.length > 0) {
      const sorted = [...window].sort((a, b) => a - b);
      p50 = sorted[Math.floor(sorted.length * 0.5)];
      p95 = sorted[Math.floor(sorted.length * 0.95)];
      avg = sorted.reduce((sum, val) => sum + val, 0) / sorted.length;
    }

    return {
      totalExecutions: total,
      successfulExecutions: counts.success,
      failedExecutions: counts.failure,
      avgLatencyMs: Math.round(avg),
      p50LatencyMs: Math.round(p50),
      p95LatencyMs: Math.round(p95),
    };
  }
}
