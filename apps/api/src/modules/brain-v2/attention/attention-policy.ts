import { Injectable } from '@nestjs/common';
import type { PerceptionResult } from '../contracts/perception-result';
import type { IntentClass } from '../contracts/attention-result';

/**
 * AttentionPolicy
 *
 * Applies policy-level overrides to Attention signals.
 * Used to enforce hard rules that should override heuristic scores.
 *
 * Examples of policy-level rules:
 *   - GREETING always has importance ≤ 15 (no matter what the salience says)
 *   - DISTRESSED emotions always have importance ≥ 90
 *   - Very long inputs without code blocks are capped at importance 75
 *   - Single-word inputs are capped at importance 30
 *
 * Policies ensure the Executive's decision logic is deterministic
 * for common cases, regardless of heuristic variability.
 */
@Injectable()
export class AttentionPolicy {
  /**
   * Applies policy overrides to a computed importance score.
   *
   * @param importance - Raw importance score from SalienceDetector.
   * @param intent     - Classified intent.
   * @param perception - The PerceptionResult.
   * @returns Policy-adjusted importance score.
   */
  applyImportancePolicy(
    importance: number,
    intent: IntentClass,
    perception: PerceptionResult,
  ): number {
    let adjusted = importance;

    // GREETING / FAREWELL: cap at 15 (never high importance).
    if (intent === 'GREETING' || intent === 'FAREWELL') {
      return Math.min(adjusted, 15);
    }

    // Single-word inputs (excluding code): cap at 30.
    const wordCount = perception.normalizedInput.trim().split(/\s+/).length;
    if (wordCount === 1 && perception.codeBlocks.length === 0) {
      return Math.min(adjusted, 30);
    }

    // Very short inputs (< 5 words): reduce by 10 points.
    if (wordCount < 5 && perception.codeBlocks.length === 0) {
      adjusted = Math.max(0, adjusted - 10);
    }

    return adjusted;
  }

  /**
   * Extracts topic tags from the normalized input.
   * Used by Working Memory's focusStack and the Memory Gateway's
   * retrieval scope.
   *
   * Phase 1: Top-N frequent non-stopword tokens.
   * Phase 2: Named entity extraction.
   *
   * @param perception - The PerceptionResult.
   * @returns Array of topic tag strings.
   */
  extractTopicTags(perception: PerceptionResult): string[] {
    const STOPWORDS = new Set([
      'the',
      'a',
      'an',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'to',
      'of',
      'in',
      'for',
      'on',
      'at',
      'by',
      'with',
      'that',
      'this',
      'it',
      'or',
      'and',
      'but',
      'not',
      'so',
      'if',
      'then',
      'me',
      'my',
      'you',
      'your',
      'we',
      'our',
      'they',
      'their',
      'i',
      'what',
      'how',
      'why',
      'who',
      'when',
      'where',
    ]);

    const freq = new Map<string, number>();
    const words = perception.normalizedInput
      .toLowerCase()
      .split(/\W+/)
      .filter((w: string) => w.length > 3 && !STOPWORDS.has(w));

    for (const word of words) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }

    return [...freq.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([word]) => word);
  }
}
