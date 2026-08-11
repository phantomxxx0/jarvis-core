import { BrainValidationStatus } from '../enums/brain-validation-status.enum';

/**
 * Represents an individual check performed against a plan or step.
 */
export interface BrainValidation {
  readonly id: string;
  readonly category: string; // e.g., 'SECURITY', 'POLICY', 'CONSISTENCY'
  readonly status: BrainValidationStatus;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly targetId?: string; // e.g., specific stepId or planId
}
