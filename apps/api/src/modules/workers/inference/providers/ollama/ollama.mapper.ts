import { InferenceRequest } from '../../contracts/inference-request';
import { InferenceResponse } from '../../contracts/inference-response';
import { InferenceError } from '../../types/inference-error.type';
import { ModelInfo } from '../../contracts/model-info';
import { ModelType } from '../../enums/model-type.enum';
import { ModelStatus } from '../../enums/model-status.enum';
import { InferenceProviderType } from '../../enums/provider.enum';
import {
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaMessage,
  OllamaModelInfo,
} from './ollama.types';

export class OllamaMapper {
  static toChatRequest(request: InferenceRequest): OllamaChatRequest {
    const messages: OllamaMessage[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    if (request.messages) {
      request.messages.forEach((msg) => {
        messages.push({
          role: (msg.role as 'system' | 'user' | 'assistant') || 'user',
          content: (msg.content as string) || '',
        });
      });
    }

    if (request.prompt) {
      messages.push({ role: 'user', content: request.prompt });
    }

    return {
      model: request.modelId,
      messages,
      stream: request.stream ?? false,
      format: request.responseFormat === 'json_object' ? 'json' : undefined,
      options: {
        temperature: request.temperature,
        num_predict: request.maxTokens,
        stop: request.stopSequences as string[],
        ...request.extraOptions,
      },
    };
  }

  static toInferenceResponse(response: OllamaChatResponse): InferenceResponse {
    let finalContent = response.message?.content;
    
    // Support newer Ollama reasoning models (e.g. Qwen3) that split out the thinking
    if (!finalContent && response.message?.thinking) {
      finalContent = response.message.thinking;
    } else if (response.message?.thinking) {
      // If we have both, we can format them or just return content
      // Often you might want to prepend thinking inside <think></think> tags
      finalContent = `<think>\n${response.message.thinking}\n</think>\n\n${finalContent}`;
    }

    return {
      success: response.done,
      content: finalContent,
      finishReason: response.done_reason,
      promptTokens: response.prompt_eval_count,
      completionTokens: response.eval_count,
      totalTokens:
        (response.prompt_eval_count || 0) + (response.eval_count || 0),
      generatedAt: new Date(response.created_at || new Date().toISOString()),
    };
  }

  static toModelInfo(ollamaModel: OllamaModelInfo): ModelInfo {
    return {
      id: ollamaModel.name,
      name: ollamaModel.name,
      provider: InferenceProviderType.OLLAMA,
      type: ModelType.TEXT,
      status: ModelStatus.READY,
      capabilities: {
        supportsChat: true,
        supportsCompletion: true,
        supportsEmbeddings: true,
        supportsToolCalling: true,
        supportsVision:
          ollamaModel.details?.families?.includes('clip') || false,
        supportsAudio: false,
        supportsStreaming: true,
      },
      metadata: {
        size: ollamaModel.size,
        parameterSize: ollamaModel.details?.parameter_size,
        quantization: ollamaModel.details?.quantization_level,
      },
    };
  }

  static toError(error: unknown, modelId?: string): InferenceError {
    const err = (error && typeof error === 'object' ? error : {}) as Record<
      string,
      unknown
    >;
    const response = (
      err.response && typeof err.response === 'object' ? err.response : {}
    ) as Record<string, unknown>;
    const data = (
      response.data && typeof response.data === 'object' ? response.data : {}
    ) as Record<string, unknown>;

    return {
      code:
        typeof response.status === 'number'
          ? String(response.status)
          : typeof response.status === 'string'
            ? response.status
            : 'OLLAMA_ERROR',
      message:
        typeof data.error === 'string'
          ? data.error
          : typeof err.message === 'string'
            ? err.message
            : 'Unknown Ollama Error',
      timestamp: new Date(),
      provider: InferenceProviderType.OLLAMA,
      modelId,
      details: {
        stack: err.stack,
        code: err.code,
      },
    };
  }
}
