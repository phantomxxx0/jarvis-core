import { Module } from '@nestjs/common';
import { PerceptionService } from './perception.service';
import { InputValidator } from './input-validator';
import { ModalityDetector } from './modality-detector';
import { MessageParser } from './message-parser';
import { InputNormalizer } from './input-normalizer';
import { ContextBuilder } from './context-builder';

/**
 * PerceptionModule (Brain V2)
 *
 * The Perception Layer module. Normalizes all incoming BrainInputs
 * regardless of modality (text, voice, vision, robotics, IoT).
 *
 * No external module dependencies — Perception is deliberately
 * isolated from all other Brain V2 systems to ensure it can never
 * accidentally call the LLM or access memory.
 *
 * Exported:
 *   - PerceptionService: the primary entry point for input normalization.
 */
@Module({
  providers: [
    PerceptionService,
    InputValidator,
    ModalityDetector,
    MessageParser,
    InputNormalizer,
    ContextBuilder,
  ],
  exports: [PerceptionService],
})
export class PerceptionModule {}
