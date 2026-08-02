import { EmbeddingError } from '../types/embedding-error.type';

export interface EmbeddingResponse {
  readonly success: boolean;
  readonly embeddings?: ReadonlyArray<number>;
  readonly error?: EmbeddingError;
  readonly generatedAt: Date;
}
