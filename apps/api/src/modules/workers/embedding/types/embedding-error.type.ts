export type EmbeddingError = {
  readonly code: string;
  readonly message: string;
  readonly providerType: string;
  readonly details?: Record<string, unknown>;
};
