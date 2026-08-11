import { Injectable } from '@nestjs/common';
import type { PerceptionResult } from '../contracts/perception-result';
import type { EmotionalValence } from '../contracts/attention-result';

/**
 * EmotionDetector
 *
 * Detects the emotional valence of a normalized input.
 * Used by Working Memory to set `emotionalState`, and by the
 * Language Generator to select the appropriate response tone.
 *
 * Phase 1: Lexical matching against curated signal lists.
 * Phase 2: Optional sentiment classifier via feature flag.
 */
@Injectable()
export class EmotionDetector {
  private readonly DISTRESSED_SIGNALS =
    /\b(help\s+me|suicidal|crisis|depressed|breakdown|can'?t\s+cope|drowning|hopeless|worthless|end\s+it|harm|hurt\s+(myself|yourself))\b/i;

  private readonly NEGATIVE_SIGNALS =
    /\b(angry|frustrated|upset|annoyed|tired|exhausted|sad|hate|terrible|awful|horrible|disappointed|worried|anxious|stressed|nervous|scared|fear)\b/i;

  private readonly POSITIVE_SIGNALS =
    /\b(happy|excited|glad|great|awesome|love|wonderful|fantastic|amazing|excellent|good|pleased|grateful|thankful|joy|delighted)\b/i;

  private readonly EXCITED_SIGNALS =
    /(!{1,}|\b(can'?t\s+wait|so\s+excited|incredible|mind\s+blown|wow|omg|finally)\b)/i;

  /**
   * Detects emotional valence from a PerceptionResult.
   *
   * @param perception - The PerceptionResult from the Perception Layer.
   * @returns The detected EmotionalValence.
   */
  detect(perception: PerceptionResult): EmotionalValence {
    const text = perception.normalizedInput;

    // Check for crisis signals first — highest priority.
    if (this.DISTRESSED_SIGNALS.test(text)) {
      return 'DISTRESSED';
    }

    if (this.NEGATIVE_SIGNALS.test(text)) {
      return 'NEGATIVE';
    }

    if (this.EXCITED_SIGNALS.test(text)) {
      return 'EXCITED';
    }

    if (this.POSITIVE_SIGNALS.test(text)) {
      return 'POSITIVE';
    }

    return 'NEUTRAL';
  }
}
