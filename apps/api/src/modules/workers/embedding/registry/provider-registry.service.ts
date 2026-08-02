import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IEmbeddingProvider } from '../interfaces/embedding-provider.interface';
import { EmbeddingProviderType } from '../enums/provider.enum';

@Injectable()
export class ProviderRegistryService {
  private readonly logger = new Logger(ProviderRegistryService.name);
  private readonly providers = new Map<
    EmbeddingProviderType,
    IEmbeddingProvider
  >();

  registerProvider(provider: IEmbeddingProvider): void {
    if (this.providers.has(provider.providerType)) {
      this.logger.warn(
        `Provider ${provider.providerType} is already registered. Overwriting.`,
      );
    }
    this.providers.set(provider.providerType, provider);
    this.logger.log(`Registered embedding provider: ${provider.providerType}`);
  }

  unregisterProvider(providerType: EmbeddingProviderType): void {
    this.providers.delete(providerType);
    this.logger.log(`Unregistered embedding provider: ${providerType}`);
  }

  getProvider(
    providerType: EmbeddingProviderType,
  ): IEmbeddingProvider | undefined {
    return this.providers.get(providerType);
  }

  resolveProvider(providerType: EmbeddingProviderType): IEmbeddingProvider {
    const provider = this.getProvider(providerType);
    if (!provider) {
      throw new NotFoundException(
        `Embedding provider ${providerType} not found in registry.`,
      );
    }
    return provider;
  }

  listProviders(): ReadonlyArray<IEmbeddingProvider> {
    return Array.from(this.providers.values());
  }
}
