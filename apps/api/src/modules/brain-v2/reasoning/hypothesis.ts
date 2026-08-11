/**
 * Hypothesis
 *
 * Represents a candidate explanation or plan for achieving a goal.
 * Used by the Reasoning pipeline to generate and evaluate alternatives.
 * Phase 1: Stub. Phase 2: LLM-driven hypothesis generation.
 */
export interface Hypothesis {
  id: string;
  description: string;
  confidence: number;
  supportingEvidence: string[];
  contradictingEvidence: string[];
}

/**
 * HypothesisSet
 *
 * A collection of candidate hypotheses for ranking.
 */
export interface HypothesisSet {
  goal: string;
  candidates: Hypothesis[];
  bestCandidate: Hypothesis | null;
}

/**
 * Creates a trivial single-hypothesis set for direct execution paths.
 * Used in Phase 1 when reasoning is bypassed.
 */
export function createDirectHypothesis(goal: string): HypothesisSet {
  const h: Hypothesis = {
    id: `hyp_${Date.now()}`,
    description: `Direct execution: ${goal}`,
    confidence: 0.9,
    supportingEvidence: [],
    contradictingEvidence: [],
  };
  return { goal, candidates: [h], bestCandidate: h };
}
