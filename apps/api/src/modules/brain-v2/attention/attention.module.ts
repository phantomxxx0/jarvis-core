import { Module } from '@nestjs/common';
import { AttentionService } from './attention.service';
import { IntentDetector } from './intent-detector';
import { UrgencyDetector } from './urgency-detector';
import { NoveltyDetector } from './novelty-detector';
import { EmotionDetector } from './emotion-detector';
import { SalienceDetector } from './salience-detector';
import { AttentionPolicy } from './attention-policy';

/**
 * AttentionModule (Brain V2)
 *
 * The Attention System module. Computes cognitive signals (importance,
 * urgency, intent, emotion, novelty) from normalized PerceptionResults.
 *
 * Zero external dependencies — all computation is in-process, rule-based.
 * Phase 2 will optionally inject InferenceModule for LLM-enhanced attention.
 *
 * Exported:
 *   - AttentionService: the primary entry point for cognitive signal computation.
 */
@Module({
  providers: [
    AttentionService,
    IntentDetector,
    UrgencyDetector,
    NoveltyDetector,
    EmotionDetector,
    SalienceDetector,
    AttentionPolicy,
  ],
  exports: [AttentionService],
})
export class AttentionModule {}
