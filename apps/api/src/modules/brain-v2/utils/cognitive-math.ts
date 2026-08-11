/**
 * Clamps a number between a minimum and maximum value.
 *
 * @param value - The value to clamp.
 * @param min   - Minimum allowed value.
 * @param max   - Maximum allowed value.
 * @returns The clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Normalizes a raw score to the 0–100 range.
 *
 * @param score    - The raw score.
 * @param rawMin   - The minimum possible raw score.
 * @param rawMax   - The maximum possible raw score.
 * @returns Normalized score in [0, 100].
 */
export function normalizeScore(
  score: number,
  rawMin: number,
  rawMax: number,
): number {
  if (rawMax === rawMin) return 50;
  return clamp(((score - rawMin) / (rawMax - rawMin)) * 100, 0, 100);
}

/**
 * Computes a weighted average of an array of scores.
 *
 * @param scores  - Array of { value, weight } pairs.
 * @returns Weighted average score.
 */
export function weightedAverage(
  scores: Array<{ value: number; weight: number }>,
): number {
  if (scores.length === 0) return 0;
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = scores.reduce((sum, s) => sum + s.value * s.weight, 0);
  return weightedSum / totalWeight;
}

/**
 * Generates a unique trace ID for a cognitive cycle.
 *
 * Format: 'trace_v2_<timestamp>_<random_suffix>'
 *
 * @returns A unique trace identifier string.
 */
export function generateTraceId(): string {
  const timestamp = Date.now();
  const suffix = Math.random().toString(36).slice(2, 8);
  return `trace_v2_${timestamp}_${suffix}`;
}

/**
 * Safely serializes an object to JSON, replacing circular references
 * with a placeholder string.
 *
 * Used for safe logging of cognitive context objects.
 *
 * @param value - The value to serialize.
 * @returns JSON string safe for logging.
 */
export function safeJsonSerialize(value: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(value, (_key, val) => {
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
    }
    return val as unknown;
  });
}
