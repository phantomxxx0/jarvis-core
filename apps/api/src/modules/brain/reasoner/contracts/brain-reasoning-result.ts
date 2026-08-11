import { BrainDecision } from './brain-decision';
import { BrainValidation } from './brain-validation';
import { BrainReasoningError } from '../types/brain-reasoning-error.type';

/**
 * Represents the final outcome of the reasoning operation.
 */
export interface BrainReasoningResult {
  readonly requestId: string;
  readonly decision: BrainDecision;
  readonly validations: ReadonlyArray<BrainValidation>;
  readonly success: boolean;
  readonly error?: BrainReasoningError;
  readonly completedAt: Date;
}
