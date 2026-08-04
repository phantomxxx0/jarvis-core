import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  RuntimeEvent,
  ProviderStateChangedEvent,
} from '../events/runtime-events';
import { ObservationManagerService } from '../../observation/services/observation-manager.service';
import { ProviderHealth } from '../../execution/contracts/provider-health.enum';

@Injectable()
export class RuntimeObservationListener {
  private readonly logger = new Logger(RuntimeObservationListener.name);

  constructor(private readonly observationManager: ObservationManagerService) {}

  @OnEvent(RuntimeEvent.PROVIDER_HEALTHY)
  @OnEvent(RuntimeEvent.PROVIDER_DEGRADED)
  @OnEvent(RuntimeEvent.PROVIDER_OFFLINE)
  async handleProviderStateChange(
    event: ProviderStateChangedEvent,
  ): Promise<void> {
    this.logger.debug(
      `Relaying state change for provider [${event.providerId}] to ObservationManager.`,
    );

    // We do NOT block, we let this process in the background.
    await this.observationManager
      .ingestObservation({
        userId: 'system',
        source: 'RUNTIME_MONITOR',
        type: 'PROVIDER_STATE_CHANGE',
        payload: {
          providerId: event.providerId,
          oldState: event.oldState,
          newState: event.newState,
          reason: event.reason,
          timestamp: event.timestamp.toISOString(),
        },
        confidence: 100,
        priority: event.newState === ProviderHealth.OFFLINE ? 90 : 50, // Higher priority if offline
      })
      .catch((err) => {
        this.logger.error(`Failed to ingest runtime observation: ${err}`);
      });
  }
}
