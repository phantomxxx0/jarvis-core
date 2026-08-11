/**
 * Contextual metadata provided alongside an inference request.
 */
export type InferenceContext = {
  readonly correlationId?: string;
  readonly sessionId?: string;
  readonly userId?: string;
  readonly timeoutMs?: number;
  readonly priority?: number;
} & Record<string, unknown>;
