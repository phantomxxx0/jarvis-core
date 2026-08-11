import { Injectable, Logger } from '@nestjs/common';
import type { PerceptionResult } from '../contracts/perception-result';
import type { AttentionResult } from '../contracts/attention-result';
import { IntentDetector } from './intent-detector';
import { UrgencyDetector } from './urgency-detector';
import { NoveltyDetector } from './novelty-detector';
import { EmotionDetector } from './emotion-detector';
import { SalienceDetector } from './salience-detector';
import { AttentionPolicy } from './attention-policy';

/**
 * AttentionService
 *
 * The Attention System's primary orchestrator. Coordinates all five
 * detectors and applies attention policy to produce an AttentionResult.
 *
 * Execution (all parallel in Phase 1 — no detector depends on another):
 *   ┌─────────────────────────────────────────────┐
 *   │  IntentDetector │ UrgencyDetector │ ...etc  │
 *   └─────────────────────────────────────────────┘
 *                           ↓
 *                   AttentionPolicy
 *                           ↓
 *                    AttentionResult
 *
 * GUARANTEES:
 *   - Zero LLM calls in Phase 1.
 *   - Never throws (always returns a fallback AttentionResult).
 *   - Target latency: < 3ms.
 */
@Injectable()
export class AttentionService {
  readonly moduleName = 'Attention';
  private readonly logger = new Logger(AttentionService.name);

  constructor(
    private readonly intentDetector: IntentDetector,
    private readonly urgencyDetector: UrgencyDetector,
    private readonly noveltyDetector: NoveltyDetector,
    private readonly emotionDetector: EmotionDetector,
    private readonly salienceDetector: SalienceDetector,
    private readonly policy: AttentionPolicy,
  ) {}

  /** @implements ICognitiveModule */
  isReady(): boolean {
    return true;
  }

  /**
   * Analyzes a PerceptionResult and produces AttentionResult.
   *
   * @param perception      - The normalized input from the Perception Layer.
   * @param recentTopicTags - Current Working Memory focusStack (for novelty detection).
   * @returns A complete AttentionResult with all cognitive signals.
   */
  analyze(
    perception: PerceptionResult,
    recentTopicTags: string[] = [],
  ): AttentionResult {
    const startTime = Date.now();

    try {
      // All detectors run independently (pure functions, no IO).
      const { intent, confidence: intentConfidence } =
        this.intentDetector.detect(perception);
      const emotion = this.emotionDetector.detect(perception);
      const urgency = this.urgencyDetector.score(perception);
      const novelty = this.noveltyDetector.score(perception, recentTopicTags);
      const rawImportance = this.salienceDetector.score(
        perception,
        intent,
        emotion,
      );

      // Apply policy overrides.
      const importance = this.policy.applyImportancePolicy(
        rawImportance,
        intent,
        perception,
      );
      const topicTags = this.policy.extractTopicTags(perception);

      const isContinuation = novelty < 50;

      const result: AttentionResult = {
        importance,
        urgency,
        intent,
        intentConfidence,
        emotion,
        novelty,
        topicTags,
        isContinuation,
        analyzedAt: new Date(),
      };

      this.logger.debug(
        `[Attention] intent=${intent}(${intentConfidence.toFixed(2)}) ` +
          `importance=${importance} urgency=${urgency} novelty=${novelty} ` +
          `emotion=${emotion} in ${Date.now() - startTime}ms`,
      );

      return result;
    } catch (err) {
      this.logger.error(
        `[Attention] Analysis failed, returning safe defaults: ${(err as Error).message}`,
      );

      // Safe fallback — conservative defaults push toward MEMORY_RETRIEVAL path.
      return {
        importance: 50,
        urgency: 20,
        intent: 'UNKNOWN',
        intentConfidence: 0.3,
        emotion: 'NEUTRAL',
        novelty: 50,
        topicTags: [],
        isContinuation: false,
        analyzedAt: new Date(),
      };
    }
  }
}
