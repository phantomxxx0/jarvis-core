/**
 * CognitiveBudgetResult
 *
 * The result of a budget check.
 */
export interface CognitiveBudgetResult {
  /** Whether the operation is within budget. */
  withinBudget: boolean;

  /** Elapsed time in milliseconds when checked. */
  elapsedMs: number;

  /** The configured budget in milliseconds. */
  budgetMs: number;

  /** Remaining milliseconds before the budget expires. */
  remainingMs: number;
}

/**
 * Creates a latency budget timer.
 *
 * Returns a check function that can be called at any point to determine
 * if the allocated time budget has been exceeded.
 *
 * @param budgetMs - The maximum allowed latency in milliseconds.
 * @returns A function that returns a CognitiveBudgetResult when called.
 */
export function createTimeBudget(
  budgetMs: number,
): () => CognitiveBudgetResult {
  const startTime = Date.now();

  return (): CognitiveBudgetResult => {
    const elapsedMs = Date.now() - startTime;
    const remainingMs = budgetMs - elapsedMs;
    return {
      withinBudget: remainingMs > 0,
      elapsedMs,
      budgetMs,
      remainingMs: Math.max(0, remainingMs),
    };
  };
}

/**
 * Wraps a promise with a timeout. If the promise does not resolve within
 * the given timeout, it resolves with the fallback value instead.
 *
 * Used by the ExecutionRouter to enforce latency budgets on module calls.
 *
 * @param promise - The async operation to wrap.
 * @param timeoutMs - Maximum wait time in milliseconds.
 * @param fallback - Value to return if the timeout fires.
 * @returns Promise resolving to either the original result or the fallback.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<{ result: T; timedOut: boolean }> {
  let timeoutHandle: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<{ result: T; timedOut: boolean }>(
    (resolve) => {
      timeoutHandle = setTimeout(() => {
        resolve({ result: fallback, timedOut: true });
      }, timeoutMs);
    },
  );

  const resultPromise = promise.then((result) => {
    clearTimeout(timeoutHandle);
    return { result, timedOut: false };
  });

  return Promise.race([resultPromise, timeoutPromise]);
}

/**
 * Returns the elapsed milliseconds since a given start time.
 *
 * @param startTime - The reference start timestamp (from Date.now()).
 * @returns Elapsed milliseconds.
 */
export function elapsedMs(startTime: number): number {
  return Date.now() - startTime;
}
