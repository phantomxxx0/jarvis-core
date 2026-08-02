/**
 * Represents a generic request sent to an inference provider.
 */
export interface InferenceRequest {
  readonly modelId: string;
  readonly prompt?: string;
  readonly messages?: ReadonlyArray<Record<string, unknown>>;
  readonly systemPrompt?: string;
  readonly stream?: boolean;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly tools?: ReadonlyArray<Record<string, unknown>>;
  readonly responseFormat?: 'text' | 'json_object';
  readonly stopSequences?: ReadonlyArray<string>;
  readonly extraOptions?: Record<string, unknown>;
}
