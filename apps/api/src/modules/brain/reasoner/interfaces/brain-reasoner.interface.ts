import { BrainReasoningRequest } from '../contracts/brain-reasoning-request';
import { BrainReasoningResult } from '../contracts/brain-reasoning-result';

/**
 * The Brain Reasoner evaluates plans and returns an actionable decision,
 * handling policy checks, safety evaluations, and human-in-the-loop triggers.
 */
export interface IBrainReasoner {
  /**
   * Evaluates the provided plan and produces a comprehensive reasoning result.
   */
  evaluate(request: BrainReasoningRequest): Promise<BrainReasoningResult>;
}
