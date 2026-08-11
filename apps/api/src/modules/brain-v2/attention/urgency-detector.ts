import { Injectable } from '@nestjs/common';
import type { PerceptionResult } from '../contracts/perception-result';
import { clamp } from '../utils/cognitive-math';

/**
 * UrgencyDetector
 *
 * Scores the urgency of a normalized input (0–100).
 * High urgency → system may skip optional background tasks
 * to meet latency budget faster.
 *
 * Phase 1: Rule-based signal counting.
 */
@Injectable()
export class UrgencyDetector {
  private readonly URGENCY_SIGNALS = [
    {
      pattern:
        /\b(urgent|emergency|critical|asap|immediately|right\s+now|hurry|fast|quick)\b/i,
      weight: 30,
    },
    { pattern: /!{2,}/, weight: 15 },
    {
      pattern: /\b(broken|down|outage|failing|crash|production)\b/i,
      weight: 25,
    },
    { pattern: /\bhelp\s+me\b/i, weight: 10 },
    { pattern: /\b(deadline|due|tonight|today)\b/i, weight: 15 },
  ];

  /**
   * Computes urgency score (0–100) from a PerceptionResult.
   *
   * @param perception - The PerceptionResult from the Perception Layer.
   * @returns Urgency score in [0, 100].
   */
  score(perception: PerceptionResult): number {
    const text = perception.normalizedInput;
    let total = 0;

    for (const { pattern, weight } of this.URGENCY_SIGNALS) {
      if (pattern.test(text)) {
        total += weight;
      }
    }

    return clamp(total, 0, 100);
  }
}
