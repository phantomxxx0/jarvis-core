import { Module } from '@nestjs/common';
import { CognitionMetricsService } from './latency';
import { CognitionTracker } from './cognition';
import { MemoryMetricsService } from './memory';
import { PerformanceMetricsService } from './performance';

/**
 * MetricsModule (Brain V2)
 *
 * Provides all observability and metrics tracking services.
 * All metrics services are singleton-scoped (module-level) so they
 * accumulate data across the lifetime of the application.
 *
 * Exported for use by:
 *   - ExecutiveModule (latency budget enforcement)
 *   - ConsciousnessModule (self-monitoring)
 *   - Future: external observability dashboard
 */
@Module({
  providers: [
    CognitionMetricsService,
    CognitionTracker,
    MemoryMetricsService,
    PerformanceMetricsService,
  ],
  exports: [
    CognitionMetricsService,
    CognitionTracker,
    MemoryMetricsService,
    PerformanceMetricsService,
  ],
})
export class MetricsModule {}
