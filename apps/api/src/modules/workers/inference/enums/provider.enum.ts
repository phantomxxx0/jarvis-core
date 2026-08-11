/**
 * Represents the origin provider of an inference model.
 */
export enum InferenceProviderType {
  OLLAMA = 'OLLAMA',
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GOOGLE = 'GOOGLE',
  DEEPSEEK = 'DEEPSEEK',
  VLLM = 'VLLM',
  CUSTOM = 'CUSTOM',
}
