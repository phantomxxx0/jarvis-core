/**
 * DTOs specific to the Ollama API.
 */

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  thinking?: string;
  images?: string[];
  tool_calls?: OllamaToolCall[];
}

export interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  format?: string;
  options?: Record<string, unknown>;
  keep_alive?: string | number;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message?: OllamaMessage;
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModelInfo {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaListModelsResponse {
  models: OllamaModelInfo[];
}
