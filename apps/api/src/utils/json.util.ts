import { Logger } from '@nestjs/common';

const logger = new Logger('JsonUtils');

/**
 * Sanitizes LLM output by removing <think>...</think> blocks.
 */
export function sanitizeThinkTags(text: string): string {
  if (!text) return '';
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/**
 * Extracts and parses a JSON object or array from LLM output,
 * safely handling <think> blocks and markdown ticks.
 */
export function extractAndParseJson<T>(llmOutput: string): T {
  // 1. Remove all internal reasoning blocks which might contain internal `{}` or text.
  const sanitized = sanitizeThinkTags(llmOutput);

  // 2. Try parsing the raw sanitized output directly (fast path).
  try {
    return JSON.parse(sanitized) as T;
  } catch (e) {}

  // 3. Fallback: try finding a markdown block
  try {
    const markdownMatch = sanitized.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      return JSON.parse(markdownMatch[1].trim()) as T;
    }
  } catch (e) {}

  // 4. Fallback: extract substring from first `{` or `[` to the last `}` or `]`
  try {
    const firstBrace = sanitized.indexOf('{');
    const lastBrace = sanitized.lastIndexOf('}');

    const firstBracket = sanitized.indexOf('[');
    const lastBracket = sanitized.lastIndexOf(']');

    // Determine if it's likely an object or an array based on which comes first
    let startIdx = -1;
    let endIdx = -1;

    if (
      firstBrace !== -1 &&
      (firstBracket === -1 || firstBrace < firstBracket)
    ) {
      startIdx = firstBrace;
      endIdx = lastBrace;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      endIdx = lastBracket;
    }

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonSubstring = sanitized.substring(startIdx, endIdx + 1);
      return JSON.parse(jsonSubstring) as T;
    }
  } catch (e) {}

  logger.error(
    `Failed to parse LLM JSON output. Sanitized output: ${sanitized.substring(0, 500)}...`,
  );
  throw new Error('No valid JSON object or array found in LLM output.');
}
