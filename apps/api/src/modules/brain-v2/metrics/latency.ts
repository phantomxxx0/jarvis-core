import { Injectable, Logger } from '@nestjs/common';
import type { ExecutionPath } from '../contracts/executive-decision';
import type { ModuleLatency } from '../contracts/cognitive-state';

/**
 * LatencyTracker
 *
 * Tracks per-module and per-path latencies within a cognitive cycle.
 * Designed to be instantiated once per request by the BrainV2Service
 * and passed through the pipeline.
 *
 * Not a NestJS provider — it is a plain class instantiated per-request
 * to avoid shared state between concurrent sessions.
 */
export class LatencyTracker {
  private readonly startTime: number;
  private readonly moduleRecords: ModuleLatency[] = [];

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Records the start and duration of a module's execution.
   *
   * @param module     - Module name (matches moduleName from ICognitiveModule).
   * @param activated  - Whether the module actually ran (false = skipped by Executive).
   * @param startMs    - The time (Date.now()) when the module started.
   * @param durationMs - How long the module took in milliseconds.
   */
  record(
    module: string,
    activated: boolean,
    startMs: number,
    durationMs: number,
  ): void {
    this.moduleRecords.push({ module, activated, startMs, durationMs });
  }

  /**
   * Returns total elapsed milliseconds since the tracker was created.
   */
  totalElapsed(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Returns all module latency records collected so far.
   */
  getRecords(): ModuleLatency[] {
    return [...this.moduleRecords];
  }
}

/**
 * CognitionMetricsService
 *
 * Injectable NestJS service that maintains aggregate cognitive performance
 * statistics across all requests. Used by the Consciousness module
 * and future observability dashboards.
 */
@Injectable()
export class CognitionMetricsService {
  private readonly logger = new Logger(CognitionMetricsService.name);

  /** Total number of requests processed since startup. */
  private totalRequests = 0;

  /** Rolling latency accumulator per execution path. */
  private latencyAccumulator: Partial<Record<ExecutionPath, number[]>> = {};

  /**
   * Records the outcome of a completed cognitive cycle.
   *
   * @param path      - The execution path that was used.
   * @param latencyMs - Total end-to-end latency in milliseconds.
   */
  record(path: ExecutionPath, latencyMs: number): void {
    this.totalRequests++;

    if (!this.latencyAccumulator[path]) {
      this.latencyAccumulator[path] = [];
    }

    const pathRecords = this.latencyAccumulator[path];
    pathRecords.push(latencyMs);

    // Keep only the last 100 samples per path to bound memory usage.
    if (pathRecords.length > 100) {
      pathRecords.shift();
    }

    this.logger.debug(
      `[Metrics] path=${path} latencyMs=${latencyMs} total=${this.totalRequests}`,
    );
  }

  /**
   * Returns the average latency (in ms) for a given execution path.
   * Returns 0 if no samples have been recorded for that path.
   */
  getAverageLatency(path: ExecutionPath): number {
    const records = this.latencyAccumulator[path];
    if (!records || records.length === 0) return 0;
    return records.reduce((a, b) => a + b, 0) / records.length;
  }

  /**
   * Returns the total request count since startup.
   */
  getTotalRequests(): number {
    return this.totalRequests;
  }

  /**
   * Returns average latencies for all recorded execution paths.
   */
  getAllAverageLatencies(): Partial<Record<ExecutionPath, number>> {
    const result: Partial<Record<ExecutionPath, number>> = {};
    for (const [path, records] of Object.entries(this.latencyAccumulator)) {
      if (records && records.length > 0) {
        result[path as ExecutionPath] =
          records.reduce((a, b) => a + b, 0) / records.length;
      }
    }
    return result;
  }
}
