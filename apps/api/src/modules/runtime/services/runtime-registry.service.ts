import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProviderHealth } from '../../execution/contracts/provider-health.enum';
import { ProviderMetadata } from '../../execution/contracts/provider-metadata.interface';
import {
  RuntimeEvent,
  ProviderStateChangedEvent,
} from '../events/runtime-events';

export interface ProviderRuntimeState {
  id: string;
  health: ProviderHealth;
  metadata?: ProviderMetadata;
  lastChecked: Date;
}

@Injectable()
export class RuntimeRegistryService {
  private readonly logger = new Logger(RuntimeRegistryService.name);
  private readonly states = new Map<string, ProviderRuntimeState>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  public updateProviderState(
    providerId: string,
    health: ProviderHealth,
    metadata?: ProviderMetadata,
    reason?: string,
  ): void {
    const existing = this.states.get(providerId);
    const oldHealth = existing?.health ?? ProviderHealth.UNKNOWN;

    this.states.set(providerId, {
      id: providerId,
      health,
      metadata,
      lastChecked: new Date(),
    });

    if (oldHealth !== health) {
      this.logger.log(
        `Provider [${providerId}] state changed: ${oldHealth} -> ${health}`,
      );

      let eventName: RuntimeEvent | undefined;
      if (health === ProviderHealth.READY)
        eventName = RuntimeEvent.PROVIDER_HEALTHY;
      else if (health === ProviderHealth.DEGRADED)
        eventName = RuntimeEvent.PROVIDER_DEGRADED;
      else if (
        health === ProviderHealth.OFFLINE ||
        health === ProviderHealth.UNHEALTHY
      )
        eventName = RuntimeEvent.PROVIDER_OFFLINE;

      if (eventName) {
        this.eventEmitter.emit(
          eventName,
          new ProviderStateChangedEvent(providerId, oldHealth, health, reason),
        );
      }
    }
  }

  public getProviderState(
    providerId: string,
  ): ProviderRuntimeState | undefined {
    return this.states.get(providerId);
  }

  public getAllStates(): ProviderRuntimeState[] {
    return Array.from(this.states.values());
  }

  public removeProviderState(providerId: string): void {
    this.states.delete(providerId);
  }
}
