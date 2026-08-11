/**
 * Architecture-safe serializable error type for inference operations.
 */
export interface InferenceError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;
  readonly provider?: string;
  readonly modelId?: string;
}
