import { Module } from '@nestjs/common';

/**
 * EventsModule (Brain V2)
 *
 * Provides the event infrastructure for Brain V2.
 * Brain V2 reuses the global EventEmitter2 instance registered by
 * EventEmitterModule.forRoot() in AppModule — no separate broker needed.
 *
 * This module exists as a placeholder for future event-specific
 * providers such as:
 *   - Structured event logging interceptors
 *   - Event replay / audit trail services
 *   - WebSocket bridge for real-time UI updates
 *
 * Listeners are registered in the events/listeners/ directory and
 * will be added as providers here in Phase 2.
 */
@Module({
  providers: [],
  exports: [],
})
export class BrainV2EventsModule {}
