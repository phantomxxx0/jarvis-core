import { InferenceRequest } from '../contracts/inference-request';
import { InferenceResponse } from '../contracts/inference-response';
import { InferenceContext } from '../types/inference-context.type';
import { ModelInfo } from '../contracts/model-info';
import { InferenceProviderType } from '../enums/provider.enum';

/**
 * Represents a generic execution engine that can fulfill inference requests
 * for a specific AI provider (e.g., Ollama, OpenAI, vLLM).
 */
export interface IInferenceProvider {
  /** The unique identifier of this provider implementation. */
  readonly providerType: InferenceProviderType;

  /** Initializes the provider and validates credentials or connections. */
  initialize(): Promise<void>;

  /** Retrieves the list of available models for this provider. */
  listModels(): Promise<ReadonlyArray<ModelInfo>>;

  /** Executes an inference request. */
  infer(
    request: InferenceRequest,
    context?: InferenceContext,
  ): Promise<InferenceResponse>;

  /** Executes an inference request and streams the response via an async iterable. */
  inferStream(
    request: InferenceRequest,
    context?: InferenceContext,
  ): AsyncIterable<InferenceResponse>;
}
