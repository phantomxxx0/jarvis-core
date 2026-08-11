/**
 * Architecture-safe serializable error type for reasoning operations.
 */
export interface BrainReasoningError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;
  readonly reasonerId?: string;
}
