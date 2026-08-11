/**
 * ReasoningResultV2
 *
 * V2 adapter over the existing Brain V1 ReasoningResult.
 * The Reasoning Gateway translates V1's output into this contract.
 *
 * By keeping this as a separate contract, V2 is decoupled from V1's
 * internal type evolution. If V1's ReasoningResult changes, only
 * the gateway adapter needs updating — not all of V2.
 */
export interface ReasoningResultV2 {
  /** Concise summary of the true intent behind the goal. */
  intent: string;

  /** Constraints identified from goal + context. */
  identifiedConstraints: string[];

  /** Critical information missing that may block execution. */
  missingInformation: string[];

  /** Estimated task complexity. */
  estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH';

  /** Estimated risk level of executing this goal. */
  estimatedRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  /**
   * Recommended execution strategy.
   * DIRECT:       Conversational — no planning needed.
   * PIPELINE:     Sequential linear steps.
   * PARALLEL_DAG: Complex graph of parallel tool invocations.
   */
  executionStrategy: 'DIRECT' | 'PIPELINE' | 'PARALLEL_DAG';

  /** True if clarification from the user is needed before proceeding. */
  requiresClarification: boolean;

  /** Questions to ask the user if clarification is needed. */
  clarificationQuestions?: string[];

  /** True if the system can execute this safely without user confirmation. */
  isAutonomousSafe: boolean;

  /** Wall-clock time the reasoning completed. */
  reasonedAt: Date;
}
