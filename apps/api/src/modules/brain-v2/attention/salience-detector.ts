import { Injectable } from '@nestjs/common';
import type { PerceptionResult } from '../contracts/perception-result';
import type {
  IntentClass,
  EmotionalValence,
} from '../contracts/attention-result';
import { clamp, weightedAverage } from '../utils/cognitive-math';

/**
 * SalienceDetector
 *
 * Computes the overall importance (salience) score (0–100) for a
 * normalized input. Used by the Executive to determine routing
 * tier alongside urgency and intent.
 *
 * Salience is distinct from urgency:
 *   - Urgency = time-sensitivity (how fast to respond)
 *   - Salience = cognitive weight (how much thinking to apply)
 */
@Injectable()
export class SalienceDetector {
  private readonly INTENT_IMPORTANCE: Record<IntentClass, number> = {
    GREETING: 10,
    FAREWELL: 10,
    QUESTION: 50,
    COMMAND: 70,
    CREATIVE: 55,
    TECHNICAL: 80,
    RESEARCH: 85,
    EMOTIONAL: 75,
    CLARIFICATION: 40,
    VISION_QUERY: 70,
    ROBOTICS_COMMAND: 90,
    SYSTEM: 60,
    UNKNOWN: 40,
  };

  private readonly EMOTION_IMPORTANCE: Record<EmotionalValence, number> = {
    DISTRESSED: 95,
    NEGATIVE: 60,
    FRUSTRATED: 65,
    EXCITED: 40,
    POSITIVE: 30,
    NEUTRAL: 20,
    UNKNOWN: 20,
  };

  /**
   * Computes importance (salience) score (0–100).
   *
   * @param perception - The PerceptionResult.
   * @param intent     - The classified intent.
   * @param emotion    - The detected emotional valence.
   * @returns Importance score in [0, 100].
   */
  score(
    perception: PerceptionResult,
    intent: IntentClass,
    emotion: EmotionalValence,
  ): number {
    const intentScore = this.INTENT_IMPORTANCE[intent] ?? 40;
    const emotionScore = this.EMOTION_IMPORTANCE[emotion] ?? 20;

    // Code blocks are a strong signal of technical complexity.
    const hasCodeBlocks = perception.codeBlocks.length > 0 ? 1 : 0;
    const codeBonus = hasCodeBlocks * 15;

    // Long inputs (> 200 words) tend to be more complex.
    const wordCount = perception.normalizedInput.split(/\s+/).length;
    const lengthBonus = wordCount > 200 ? 10 : wordCount > 50 ? 5 : 0;

    const raw =
      weightedAverage([
        { value: intentScore, weight: 0.6 },
        { value: emotionScore, weight: 0.4 },
      ]) +
      codeBonus +
      lengthBonus;

    return clamp(Math.round(raw), 0, 100);
  }
}
