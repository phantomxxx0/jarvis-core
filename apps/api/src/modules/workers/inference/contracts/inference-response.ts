import { InferenceError } from '../types/inference-error.type';

/**
 * Represents the outcome of an inference request.
 */
export interface InferenceResponse {
  readonly success: boolean;
  readonly content?: string;
  readonly toolCalls?: ReadonlyArray<Record<string, unknown>>;
  readonly embeddings?: ReadonlyArray<number>;
  readonly finishReason?: string;
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly totalTokens?: number;
  readonly error?: InferenceError;
  readonly generatedAt: Date;
}
