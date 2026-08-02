import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IInferenceProvider } from '../interfaces/inference-provider.interface';
import { InferenceProviderType } from '../enums/provider.enum';

/**
 * Service responsible for managing the lifecycle and registration of
 * inference providers across the Jarvis architecture.
 */
@Injectable()
export class ProviderRegistryService {
  private readonly logger = new Logger(ProviderRegistryService.name);
  private readonly providers = new Map<
    InferenceProviderType,
    IInferenceProvider
  >();

  /**
   * Registers a new inference provider.
   */
  registerProvider(provider: IInferenceProvider): void {
    if (this.providers.has(provider.providerType)) {
      this.logger.warn(
        `Provider ${provider.providerType} is already registered. Overwriting.`,
      );
    }
    this.providers.set(provider.providerType, provider);
    this.logger.log(`Registered inference provider: ${provider.providerType}`);
  }

  /**
   * Unregisters an existing inference provider.
   */
  unregisterProvider(providerType: InferenceProviderType): void {
    this.providers.delete(providerType);
    this.logger.log(`Unregistered inference provider: ${providerType}`);
  }

  /**
   * Retrieves a specific provider by its type.
   */
  getProvider(
    providerType: InferenceProviderType,
  ): IInferenceProvider | undefined {
    return this.providers.get(providerType);
  }

  /**
   * Resolves a provider, throwing an error if not found.
   */
  resolveProvider(providerType: InferenceProviderType): IInferenceProvider {
    const provider = this.getProvider(providerType);
    if (!provider) {
      throw new NotFoundException(
        `Inference provider ${providerType} not found in registry.`,
      );
    }
    return provider;
  }

  /**
   * Retrieves all currently registered providers.
   */
  listProviders(): ReadonlyArray<IInferenceProvider> {
    return Array.from(this.providers.values());
  }

  /**
   * Discovers providers, currently returning all registered ones.
   */
  discoverProviders(): ReadonlyArray<IInferenceProvider> {
    return this.listProviders();
  }
}
