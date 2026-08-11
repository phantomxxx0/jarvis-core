import { Injectable } from '@nestjs/common';
import type { BrainInput } from '../contracts/brain-input';
import type { PerceptionResult } from '../contracts/perception-result';
import { estimateTokenCount } from '../utils/token-counter';

/**
 * ContextBuilder
 *
 * Final step of the Perception Layer. Assembles all intermediate
 * perception outputs (normalized text, parsed message, detected modality)
 * into a single PerceptionResult.
 *
 * Think of this as the Perception Layer's "output assembler."
 * It does not perform normalization, parsing, or validation itself —
 * it receives pre-computed outputs from the other perception components
 * and composes them into the contract.
 */
@Injectable()
export class ContextBuilder {
  /**
   * Builds a PerceptionResult from pre-processed perception components.
   *
   * @param input          - Original BrainInput (for userId, sessionId, timestamp).
   * @param normalizedText - Output of InputNormalizer.
   * @param modality       - Output of ModalityDetector.
   * @param codeBlocks     - Code blocks extracted by MessageParser.
   * @param attachmentRefs - Attachment refs extracted by MessageParser.
   * @param languageCode   - Detected language code from InputNormalizer.
   * @param wasTruncated   - Whether the input was truncated.
   * @returns A complete PerceptionResult.
   */
  build(
    input: BrainInput,
    normalizedText: string,
    modality: import('../contracts/brain-input').InputModality,
    codeBlocks: string[],
    attachmentRefs: string[],
    languageCode: string,
    wasTruncated: boolean,
  ): PerceptionResult {
    return {
      sessionId: input.sessionId,
      userId: input.userId,
      normalizedInput: normalizedText,
      modality,
      languageCode,
      estimatedTokens: estimateTokenCount(normalizedText),
      wasTruncated,
      codeBlocks,
      attachmentRefs,
      timestamp: input.timestamp,
      perceivedAt: new Date(),
    };
  }
}
