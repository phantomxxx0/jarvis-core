import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import type { BrainInput } from '../contracts/brain-input';
import type { PerceptionResult } from '../contracts/perception-result';
import { InputValidator } from './input-validator';
import { ModalityDetector } from './modality-detector';
import { MessageParser } from './message-parser';
import { InputNormalizer } from './input-normalizer';
import { ContextBuilder } from './context-builder';

/**
 * PerceptionService
 *
 * The Perception Layer's primary orchestrator. Coordinates the five
 * perception components to transform a raw BrainInput into a
 * normalized PerceptionResult.
 *
 * Execution order (strictly sequential):
 *  1. InputValidator   → rejects invalid inputs early
 *  2. ModalityDetector → resolves input modality
 *  3. InputNormalizer  → sanitizes and normalizes text
 *  4. MessageParser    → extracts structural components
 *  5. ContextBuilder   → assembles PerceptionResult
 *
 * GUARANTEES:
 *  - Returns a PerceptionResult or throws BadRequestException.
 *  - Performs zero reasoning.
 *  - Makes zero LLM calls.
 *  - Target latency: < 5ms.
 */
@Injectable()
export class PerceptionService {
  readonly moduleName = 'Perception';
  private readonly logger = new Logger(PerceptionService.name);

  constructor(
    private readonly validator: InputValidator,
    private readonly modalityDetector: ModalityDetector,
    private readonly normalizer: InputNormalizer,
    private readonly parser: MessageParser,
    private readonly contextBuilder: ContextBuilder,
  ) {}

  /** @implements ICognitiveModule */
  isReady(): boolean {
    return true;
  }

  /**
   * Perceives a BrainInput and returns a normalized PerceptionResult.
   *
   * @param input - The raw input from the API boundary.
   * @returns A normalized PerceptionResult ready for the Attention System.
   * @throws BadRequestException if the input fails validation.
   */
  async perceive(input: BrainInput): Promise<PerceptionResult> {
    const startTime = Date.now();
    this.logger.debug(
      `[Perception] Processing input for user=${input.userId} session=${input.sessionId}`,
    );

    // 1. Validate
    const validation = this.validator.validate(input);
    if (!validation.valid) {
      throw new BadRequestException(
        `Perception validation failed: ${validation.reason}`,
      );
    }

    // 2. Detect modality
    const modality = this.modalityDetector.detect(input);

    // 3. Normalize text
    const {
      text: normalizedText,
      wasTruncated,
      languageCode,
    } = this.normalizer.normalize(input.rawInput);

    // 4. Parse structural components
    const parsed = this.parser.parse(normalizedText);

    // 5. Build result
    const result = this.contextBuilder.build(
      input,
      normalizedText,
      modality,
      parsed.codeBlocks,
      parsed.attachmentRefs,
      languageCode,
      wasTruncated,
    );

    this.logger.debug(
      `[Perception] Complete in ${Date.now() - startTime}ms. ` +
        `modality=${modality} tokens≈${result.estimatedTokens} truncated=${wasTruncated}`,
    );

    return result;
  }
}
