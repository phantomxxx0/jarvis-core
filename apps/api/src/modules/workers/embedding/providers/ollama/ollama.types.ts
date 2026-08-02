export interface OllamaEmbedRequest {
  model: string;
  input: string | string[];
  options?: Record<string, unknown>;
  keep_alive?: string | number;
}

export interface OllamaEmbedResponse {
  model: string;
  embeddings: number[][];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
}
