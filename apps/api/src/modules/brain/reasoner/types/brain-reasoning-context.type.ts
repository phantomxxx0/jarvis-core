/**
 * Carries contextual metadata throughout the reasoning process.
 */
export type BrainReasoningContext = {
  readonly correlationId?: string;
  readonly sessionId?: string;
  readonly activePolicies?: ReadonlyArray<string>;
  readonly riskTolerance?: number;
} & Record<string, unknown>;
