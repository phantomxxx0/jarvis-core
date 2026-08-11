import { Injectable } from '@nestjs/common';
import type { PerceptionResult } from '../contracts/perception-result';
import { clamp } from '../utils/cognitive-math';

/**
 * NoveltyDetector
 *
 * Scores the novelty of the current input relative to the recent
 * conversation context (0 = continuation, 100 = entirely new topic).
 *
 * High novelty → topic shift detected → Working Memory may need
 * full refresh from long-term memory.
 *
 * Phase 1: Vocabulary overlap heuristic vs. provided recent context.
 * Phase 2: Semantic similarity comparison.
 */
@Injectable()
export class NoveltyDetector {
  /**
   * Computes novelty score (0–100).
   *
   * @param perception      - The PerceptionResult from the Perception Layer.
   * @param recentTopicTags - Tags from the most recent Working Memory focusStack.
   *                          Empty if no prior context exists (→ maximum novelty).
   * @returns Novelty score in [0, 100].
   */
  score(perception: PerceptionResult, recentTopicTags: string[]): number {
    // If no prior context, everything is novel.
    if (recentTopicTags.length === 0) {
      return 80;
    }

    const inputWords = new Set(
      perception.normalizedInput
        .toLowerCase()
        .split(/\W+/)
        .filter((w: string) => w.length > 3),
    );

    const priorWords = new Set(
      recentTopicTags.flatMap((tag: string) => tag.toLowerCase().split(/\W+/)),
    );

    // Compute Jaccard-like overlap.
    let overlap = 0;
    for (const word of inputWords) {
      if (priorWords.has(word)) overlap++;
    }

    const unionSize = inputWords.size + priorWords.size - overlap;
    if (unionSize === 0) return 50;

    const similarity = overlap / unionSize;
    // High similarity → low novelty (continuation).
    // Low similarity → high novelty (topic shift).
    const novelty = (1 - similarity) * 100;

    return clamp(Math.round(novelty), 0, 100);
  }
}
