import { Injectable, Logger } from '@nestjs/common';
import { ProviderRegistryService } from '../registry/provider-registry.service';
import { EmbeddingRequest } from '../contracts/embedding-request';
import { EmbeddingResponse } from '../contracts/embedding-response';
import { EmbeddingContext } from '../types/embedding-context.type';
import { EmbeddingProviderType } from '../enums/provider.enum';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(private readonly providerRegistry: ProviderRegistryService) {}

  async initializeProviders(): Promise<void> {
    const providers = this.providerRegistry.listProviders();
    for (const provider of providers) {
      try {
        await provider.initialize();
      } catch (error) {
        this.logger.error(
          `Failed to initialize provider ${provider.providerType}`,
          error,
        );
      }
    }
  }

  async embed(
    providerType: EmbeddingProviderType,
    request: EmbeddingRequest,
    context?: EmbeddingContext,
  ): Promise<EmbeddingResponse> {
    const provider = this.providerRegistry.resolveProvider(providerType);
    return provider.embed(request, context);
  }
}
