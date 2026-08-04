import { ProviderType } from './provider-type.enum';
import { ProviderHealth } from './provider-health.enum';
import { ProviderMetadata } from './provider-metadata.interface';
import { CapabilityDefinition } from './capability-definition.interface';

export interface CapabilityProvider {
  id: string;
  type: ProviderType;

  initialize(): Promise<void>;
  health(): Promise<ProviderHealth>;
  metadata(): Promise<ProviderMetadata>;
  capabilities(): Promise<CapabilityDefinition[]>;

  execute<TArgs = unknown, TResult = unknown>(
    capabilityId: string,
    args: TArgs,
  ): Promise<TResult>;

  shutdown(): Promise<void>;
}
