export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  exponential: boolean;
  maxBackoffMs: number;
}
