import { BrainDecisionType } from '../enums/brain-decision.enum';

/**
 * Represents the comprehensive decision reached by the reasoner.
 */
export interface BrainDecision {
  readonly id: string;
  readonly decision: BrainDecisionType;
  readonly confidence: number;
  readonly explanation: string;
  readonly requirements?: ReadonlyArray<string>; // Required missing info or human interventions
  readonly generatedAt: Date;
}
