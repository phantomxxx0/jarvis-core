import type { ExecutionPath } from './executive-decision';

/**
 * ModuleLatency
 *
 * Latency record for a single cognitive module within one request.
 */
export interface ModuleLatency {
  module: string;
  startMs: number;
  durationMs: number;
  activated: boolean;
}

/**
 * CognitiveTrace
 *
 * A complete observability record for one cognitive cycle.
 * Stored with every BrainOutput for debugging, metrics, and
 * future self-improvement via the Learning module.
 *
 * Designed to be serializable (no circular refs).
 */
export interface CognitiveTrace {
  /** Unique trace identifier. */
  traceId: string;

  /** Session this trace belongs to. */
  sessionId: string;

  /** Wall-clock time the cognitive cycle started. */
  startedAt: Date;

  /** Wall-clock time the cognitive cycle completed. */
  completedAt: Date;

  /** Total end-to-end latency in milliseconds. */
  totalLatencyMs: number;

  /** Which execution path the Executive selected. */
  executionPath: ExecutionPath;

  /** Per-module latency breakdown. */
  moduleLatencies: ModuleLatency[];

  /** The Executive's decision rationale. */
  decisionRationale: string;

  /** Executive's confidence score (0.0 – 1.0). */
  decisionConfidence: number;

  /** Number of long-term memory facts retrieved. */
  memoryFactsRetrieved: number;

  /** Whether the Reasoner was activated. */
  reasonerActivated: boolean;

  /** Whether the Planner was activated. */
  plannerActivated: boolean;

  /** Number of tool/skill invocations this turn. */
  toolInvocations: number;

  /** Whether reflection was scheduled asynchronously. */
  reflectionScheduled: boolean;

  /** Whether learning was scheduled asynchronously. */
  learningScheduled: boolean;

  /** Whether any fallback was used during the cycle. */
  usedFallback: boolean;
}

/**
 * CognitiveState
 *
 * Snapshot of Brain V2's current internal state.
 * Used by the Consciousness module for self-monitoring
 * and by the metrics system for observability dashboards.
 */
export interface CognitiveState {
  /** How many active sessions Brain V2 is currently processing. */
  activeSessions: number;

  /** Average latency of the last N requests per execution path. */
  averageLatencyByPath: Record<ExecutionPath, number>;

  /** Number of requests processed since startup. */
  totalRequestsProcessed: number;

  /** Number of background tasks currently queued. */
  backgroundQueueDepth: number;

  /** Timestamp of the last request processed. */
  lastActivityAt: Date | null;
}
