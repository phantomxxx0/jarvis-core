import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { IEmbeddingProvider } from '../../interfaces/embedding-provider.interface';
import { EmbeddingRequest } from '../../contracts/embedding-request';
import { EmbeddingResponse } from '../../contracts/embedding-response';
import { EmbeddingError } from '../../types/embedding-error.type';
import { EmbeddingProviderType } from '../../enums/provider.enum';
import { EmbeddingContext } from '../../types/embedding-context.type';

import { OLLAMA_CONSTANTS } from '../../../shared/ollama/ollama.constants';
import { OllamaClient } from '../../../shared/ollama/ollama.client';
import { OllamaEmbeddingMapper } from './ollama.mapper';
import { OllamaEmbedResponse } from './ollama.types';

@Injectable()
export class OllamaProvider implements IEmbeddingProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  readonly providerType = EmbeddingProviderType.OLLAMA;

  constructor(private readonly ollamaClient: OllamaClient) {}

  async initialize(): Promise<void> {
    try {
      this.logger.log(
        `Initializing Ollama embedding provider at ${this.ollamaClient.host}`,
      );
      await this.ollamaClient.ping();
      this.logger.log('Ollama embedding provider initialized successfully.');
    } catch (error) {
      this.logger.error(
        'Failed to initialize Ollama embedding provider',
        error,
      );
      const err = new Error() as Error & EmbeddingError;
      Object.assign(err, OllamaEmbeddingMapper.toError(error));
      throw err;
    }
  }

  async embed(
    request: EmbeddingRequest,
    context?: EmbeddingContext,
  ): Promise<EmbeddingResponse> {
    try {
      const ollamaRequest = OllamaEmbeddingMapper.toEmbedRequest(request);

      const response = await firstValueFrom(
        this.ollamaClient.http.post<OllamaEmbedResponse>(
          `${this.ollamaClient.host}${OLLAMA_CONSTANTS.ENDPOINTS.EMBED}`,
          ollamaRequest,
          {
            headers: OLLAMA_CONSTANTS.DEFAULT_HEADERS,
            timeout: context?.timeoutMs || this.ollamaClient.timeout,
          },
        ),
      );

      return OllamaEmbeddingMapper.toEmbeddingResponse(response.data);
    } catch (error) {
      const err = new Error() as Error & EmbeddingError;
      Object.assign(err, OllamaEmbeddingMapper.toError(error, request.modelId));
      throw err;
    }
  }
}
