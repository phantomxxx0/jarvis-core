import { EmbeddingRequest } from '../contracts/embedding-request';
import { EmbeddingResponse } from '../contracts/embedding-response';
import { EmbeddingContext } from '../types/embedding-context.type';
import { EmbeddingProviderType } from '../enums/provider.enum';

export interface IEmbeddingProvider {
  readonly providerType: EmbeddingProviderType;
  initialize(): Promise<void>;
  embed(
    request: EmbeddingRequest,
    context?: EmbeddingContext,
  ): Promise<EmbeddingResponse>;
}
