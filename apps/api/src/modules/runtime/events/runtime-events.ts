import { ProviderHealth } from '../../execution/contracts/provider-health.enum';

export enum RuntimeEvent {
  PROVIDER_HEALTHY = 'runtime.provider.healthy',
  PROVIDER_OFFLINE = 'runtime.provider.offline',
  PROVIDER_DEGRADED = 'runtime.provider.degraded',
}

export class ProviderStateChangedEvent {
  constructor(
    public readonly providerId: string,
    public readonly oldState: ProviderHealth,
    public readonly newState: ProviderHealth,
    public readonly reason?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
