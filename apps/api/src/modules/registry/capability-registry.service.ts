import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CapabilityProvider } from '../execution/contracts/capability-provider.interface';
import { CapabilityDefinition } from '../execution/contracts/capability-definition.interface';

export enum RegistryEvent {
  PROVIDER_REGISTERED = 'registry.provider.registered',
  PROVIDER_REMOVED = 'registry.provider.removed',
  PROVIDER_HEALTHY = 'registry.provider.healthy',
  PROVIDER_UNHEALTHY = 'registry.provider.unhealthy',
  CAPABILITY_ADDED = 'registry.capability.added',
}

@Injectable()
export class CapabilityRegistryService {
  private readonly logger = new Logger(CapabilityRegistryService.name);

  // Maps Provider ID -> CapabilityProvider instance
  private readonly providers = new Map<string, CapabilityProvider>();

  // Maps Capability ID -> Array of Provider IDs
  private readonly capabilities = new Map<string, Set<string>>();

  // Maps Capability ID -> CapabilityDefinition
  private readonly definitions = new Map<string, CapabilityDefinition>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  public async registerProvider(provider: CapabilityProvider): Promise<void> {
    if (this.providers.has(provider.id)) {
      this.logger.warn(
        `Provider [${provider.id}] is already registered. Overwriting.`,
      );
    }

    try {
      // Initialize the provider
      await provider.initialize();
      this.providers.set(provider.id, provider);

      // Register its capabilities
      const caps = await provider.capabilities();
      for (const cap of caps) {
        this.registerCapability(cap, provider.id);
      }

      this.logger.log(
        `Registered provider: [${provider.id}] (${provider.type}) with ${caps.length} capabilities.`,
      );
      this.eventEmitter.emit(RegistryEvent.PROVIDER_REGISTERED, {
        providerId: provider.id,
        type: provider.type,
      });
    } catch (error) {
      this.logger.error(
        `Failed to register provider [${provider.id}]`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  public async removeProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) return;

    try {
      await provider.shutdown();
    } catch (err) {
      this.logger.warn(
        `Error shutting down provider [${providerId}] during removal: ${err}`,
      );
    }

    this.providers.delete(providerId);

    // Clean up capability mappings
    for (const [capId, providerIds] of this.capabilities.entries()) {
      if (providerIds.has(providerId)) {
        providerIds.delete(providerId);
        if (providerIds.size === 0) {
          this.definitions.delete(capId);
          this.capabilities.delete(capId);
        }
      }
    }

    this.logger.log(`Removed provider: [${providerId}]`);
    this.eventEmitter.emit(RegistryEvent.PROVIDER_REMOVED, { providerId });
  }

  private registerCapability(
    definition: CapabilityDefinition,
    providerId: string,
  ): void {
    if (!this.capabilities.has(definition.id)) {
      this.capabilities.set(definition.id, new Set());
      this.definitions.set(definition.id, definition);
      this.eventEmitter.emit(RegistryEvent.CAPABILITY_ADDED, {
        capabilityId: definition.id,
      });
    }
    this.capabilities.get(definition.id)!.add(providerId);
  }

  /**
   * Returns a list of candidate providers capable of executing the requested capability.
   * Selection logic (e.g. load balancing, latency matching) should be done externally.
   */
  public getCandidates(capabilityId: string): CapabilityProvider[] {
    const providerIds = this.capabilities.get(capabilityId);
    if (!providerIds || providerIds.size === 0) {
      return [];
    }

    return Array.from(providerIds)
      .map((id) => this.providers.get(id))
      .filter((p): p is CapabilityProvider => p !== undefined);
  }

  public getCapabilityDefinition(
    capabilityId: string,
  ): CapabilityDefinition | undefined {
    return this.definitions.get(capabilityId);
  }

  public getAllDefinitions(): CapabilityDefinition[] {
    return Array.from(this.definitions.values());
  }

  public getProvider(providerId: string): CapabilityProvider | undefined {
    return this.providers.get(providerId);
  }

  public getAllProviders(): CapabilityProvider[] {
    return Array.from(this.providers.values());
  }
}
