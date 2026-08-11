import { Module } from '@nestjs/common';
import { InternalStateTracker } from './internal-state';
import { SelfMonitor } from './self-monitor';
import { MetaCognition } from './meta-cognition';

/**
 * ConsciousnessModule (Brain V2)
 *
 * Provides self-monitoring and meta-cognition capabilities.
 * Allows Brain V2 to track its own health, latency, and queue depths,
 * and generate insights for self-improvement.
 *
 * All state is in-process and singleton-scoped to aggregate metrics
 * across all active sessions.
 *
 * Exported:
 *   - InternalStateTracker: hooks for cycle tracking.
 *   - SelfMonitor: anomaly detection.
 *   - MetaCognition: self-analysis.
 */
@Module({
  providers: [InternalStateTracker, SelfMonitor, MetaCognition],
  exports: [InternalStateTracker, SelfMonitor, MetaCognition],
})
export class ConsciousnessModule {}
