import { Module } from '@nestjs/common';
import { EmotionService } from './emotion.service';

/**
 * EmotionModule (Brain V2)
 *
 * Tracks and modulates emotional state across cognitive sessions.
 * Provides emotional context to the Language Generator for tone selection.
 *
 * Zero external dependencies in Phase 1.
 * Phase 2: Will optionally import a sentiment analysis service.
 */
@Module({
  providers: [EmotionService],
  exports: [EmotionService],
})
export class EmotionModule {}
