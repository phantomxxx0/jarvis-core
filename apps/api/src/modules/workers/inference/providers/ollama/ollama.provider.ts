import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { IInferenceProvider } from '../../interfaces/inference-provider.interface';
import { InferenceRequest } from '../../contracts/inference-request';
import { InferenceResponse } from '../../contracts/inference-response';
import { InferenceError } from '../../types/inference-error.type';
import { ModelInfo } from '../../contracts/model-info';
import { InferenceProviderType } from '../../enums/provider.enum';
import { InferenceContext } from '../../types/inference-context.type';

import { OLLAMA_CONSTANTS } from '../../../shared/ollama/ollama.constants';
import { OllamaClient } from '../../../shared/ollama/ollama.client';
import { OllamaMapper } from './ollama.mapper';
import { OllamaListModelsResponse, OllamaChatResponse } from './ollama.types';

@Injectable()
export class OllamaProvider implements IInferenceProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  readonly providerType = InferenceProviderType.OLLAMA;

  constructor(private readonly ollamaClient: OllamaClient) {}

  async initialize(): Promise<void> {
    try {
      this.logger.log(
        `Initializing Ollama provider at ${this.ollamaClient.host}`,
      );
      await this.ollamaClient.ping();
      this.logger.log('Ollama provider initialized successfully.');
    } catch (error) {
      this.logger.error('Failed to initialize Ollama provider', error);
      const err = new Error() as Error & InferenceError;
      Object.assign(err, OllamaMapper.toError(error));
      throw err;
    }
  }

  async listModels(): Promise<ReadonlyArray<ModelInfo>> {
    try {
      const response = await firstValueFrom(
        this.ollamaClient.http.get<OllamaListModelsResponse>(
          `${this.ollamaClient.host}${OLLAMA_CONSTANTS.ENDPOINTS.TAGS}`,
          { timeout: this.ollamaClient.timeout },
        ),
      );

      return response.data.models.map((model) =>
        OllamaMapper.toModelInfo(model),
      );
    } catch (error) {
      const err = new Error() as Error & InferenceError;
      Object.assign(err, OllamaMapper.toError(error));
      throw err;
    }
  }

  async infer(
    request: InferenceRequest,
    context?: InferenceContext,
  ): Promise<InferenceResponse> {
    try {
      const ollamaRequest = OllamaMapper.toChatRequest({
        ...request,
        stream: false,
      });

      const response = await firstValueFrom(
        this.ollamaClient.http.post<OllamaChatResponse>(
          `${this.ollamaClient.host}${OLLAMA_CONSTANTS.ENDPOINTS.CHAT}`,
          ollamaRequest,
          {
            headers: OLLAMA_CONSTANTS.DEFAULT_HEADERS,
            timeout: context?.timeoutMs || this.ollamaClient.timeout,
          },
        ),
      );

      this.logger.debug('=== OLLAMA RAW RESPONSE ===');
      this.logger.debug(JSON.stringify(response.data, null, 2));

      const inferenceResponse = OllamaMapper.toInferenceResponse(response.data);
      this.logger.debug('=== MAPPED INFERENCE RESPONSE ===');
      this.logger.debug(inferenceResponse);

      return inferenceResponse;
    } catch (error) {
      const err = new Error() as Error & InferenceError;
      Object.assign(err, OllamaMapper.toError(error, request.modelId));
      throw err;
    }
  }

  async *inferStream(
    request: InferenceRequest,
    context?: InferenceContext,
  ): AsyncIterable<InferenceResponse> {
    try {
      const ollamaRequest = OllamaMapper.toChatRequest({
        ...request,
        stream: true,
      });

      const response = await firstValueFrom(
        this.ollamaClient.http.post<AsyncIterable<Buffer>>(
          `${this.ollamaClient.host}${OLLAMA_CONSTANTS.ENDPOINTS.CHAT}`,
          ollamaRequest,
          {
            headers: OLLAMA_CONSTANTS.DEFAULT_HEADERS,
            timeout: context?.timeoutMs || this.ollamaClient.timeout,
            responseType: 'stream',
          },
        ),
      );

      const stream = response.data;

      for await (const chunk of stream) {
        const lines = chunk
          .toString()
          .split('\n')
          .filter((line: string) => line.trim() !== '');

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line) as OllamaChatResponse;
            yield OllamaMapper.toInferenceResponse(parsed);
          } catch {
            // Ignore incomplete JSON chunks
          }
        }
      }
    } catch (error) {
      const err = new Error() as Error & InferenceError;
      Object.assign(err, OllamaMapper.toError(error, request.modelId));
      throw err;
    }
  }
}
