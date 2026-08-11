import { Injectable, Logger } from '@nestjs/common';
import { ProviderRegistryService } from '../registry/provider-registry.service';
import { InferenceRequest } from '../contracts/inference-request';
import { InferenceResponse } from '../contracts/inference-response';
import { InferenceContext } from '../types/inference-context.type';
import { ModelInfo } from '../contracts/model-info';
import { InferenceProviderType } from '../enums/provider.enum';

/**
 * Service orchestrating inference operations. Acts as the primary abstraction layer
 * separating the Brain modules from specific AI providers.
 */
@Injectable()
export class InferenceService {
  private readonly logger = new Logger(InferenceService.name);

  constructor(private readonly providerRegistry: ProviderRegistryService) {}

  /**
   * Initializes all registered providers.
   */
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

  /**
   * Executes an inference request against a specified provider.
   */
  async infer(
    providerType: InferenceProviderType,
    request: InferenceRequest,
    context?: InferenceContext,
  ): Promise<InferenceResponse> {
    const tStart = Date.now();
    const provider = this.providerRegistry.resolveProvider(providerType);

    this.logger.debug(
      `\n================ INFERENCE TRACE ================\nProvider: ${providerType}\nModel: ${request.modelId}\nPrompt:\n${request.prompt || JSON.stringify(request.messages)}\n=================================================`,
    );

    try {
      const result = await provider.infer(request, context);

      this.logger.debug(
        `\n================ INFERENCE RESULT ================\nDuration: ${Date.now() - tStart}ms\nRaw Response:\n${JSON.stringify(result.content)}\n==================================================`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `\n================ INFERENCE ERROR ================\nDuration: ${Date.now() - tStart}ms\nError: ${(error as Error).message}\n=================================================`,
      );
      throw error;
    }
  }

  /**
   * Executes an inference request and streams the response.
   */
  async *inferStream(
    providerType: InferenceProviderType,
    request: InferenceRequest,
    context?: InferenceContext,
  ): AsyncIterable<InferenceResponse> {
    const provider = this.providerRegistry.resolveProvider(providerType);
    yield* provider.inferStream(request, context);
  }

  /**
   * Lists all models across all registered providers, or for a specific provider.
   */
  async listModels(
    providerType?: InferenceProviderType,
  ): Promise<ReadonlyArray<ModelInfo>> {
    if (providerType) {
      const provider = this.providerRegistry.resolveProvider(providerType);
      return provider.listModels();
    }

    const allModels: ModelInfo[] = [];
    const providers = this.providerRegistry.listProviders();
    for (const provider of providers) {
      const models = await provider.listModels();
      allModels.push(...models);
    }
    return allModels;
  }

  /**
   * Retrieves detailed information about a specific model.
   */
  async getModel(
    modelId: string,
    providerType: InferenceProviderType,
  ): Promise<ModelInfo | undefined> {
    const models = await this.listModels(providerType);
    return models.find((m) => m.id === modelId);
  }
}
