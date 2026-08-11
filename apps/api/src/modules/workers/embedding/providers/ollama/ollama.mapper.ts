import { EmbeddingRequest } from '../../contracts/embedding-request';
import { EmbeddingResponse } from '../../contracts/embedding-response';
import { EmbeddingError } from '../../types/embedding-error.type';
import { EmbeddingProviderType } from '../../enums/provider.enum';
import { OllamaEmbedRequest, OllamaEmbedResponse } from './ollama.types';

export class OllamaEmbeddingMapper {
  static toEmbedRequest(request: EmbeddingRequest): OllamaEmbedRequest {
    return {
      model: request.modelId,
      input: request.input,
    };
  }

  static toEmbeddingResponse(response: OllamaEmbedResponse): EmbeddingResponse {
    return {
      success: true,
      embeddings: response.embeddings[0],
      generatedAt: new Date(),
    };
  }

  static toError(error: unknown, modelId?: string): EmbeddingError {
    const err = error as Record<string, unknown>;

    const axiosError = err.response as Record<string, unknown> | undefined;
    const axiosData = axiosError?.data as Record<string, unknown> | undefined;

    return {
      code: typeof err.code === 'string' ? err.code : 'OLLAMA_EMBED_ERROR',
      message:
        typeof axiosData?.error === 'string'
          ? axiosData.error
          : typeof err.message === 'string'
            ? err.message
            : 'Unknown error occurred in Ollama provider',
      providerType: EmbeddingProviderType.OLLAMA,
      details: {
        modelId,
        status: axiosError?.status,
        url: (err.config as Record<string, unknown> | undefined)?.url,
      },
    };
  }
}
