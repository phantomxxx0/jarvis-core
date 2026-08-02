import { ModelInfo } from '../contracts/model-info';
import { ModelType } from '../enums/model-type.enum';
import { InferenceProviderType } from '../enums/provider.enum';

/**
 * A central registry managing the availability and capabilities of all inference models
 * across all active providers.
 */
export interface IModelRegistry {
  /** Registers a new model in the registry. */
  register(model: ModelInfo): Promise<void>;

  /** Removes a model from the registry. */
  unregister(modelId: string, provider: InferenceProviderType): Promise<void>;

  /** Retrieves metadata for a specific model. */
  getModel(
    modelId: string,
    provider?: InferenceProviderType,
  ): Promise<ModelInfo | undefined>;

  /** Discovers available models matching specific criteria. */
  discover(criteria: {
    provider?: InferenceProviderType;
    type?: ModelType;
    requiresVision?: boolean;
    requiresToolCalling?: boolean;
  }): Promise<ReadonlyArray<ModelInfo>>;
}
