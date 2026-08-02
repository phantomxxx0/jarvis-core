import { InferenceProviderType } from '../enums/provider.enum';
import { ModelType } from '../enums/model-type.enum';
import { ModelStatus } from '../enums/model-status.enum';
import { ModelCapability } from './model-capability';

/**
 * Metadata and configuration describing an available model.
 */
export interface ModelInfo {
  readonly id: string;
  readonly name: string;
  readonly provider: InferenceProviderType;
  readonly type: ModelType;
  readonly status: ModelStatus;
  readonly capabilities: ModelCapability;
  readonly version?: string;
  readonly metadata?: Record<string, unknown>;
}
