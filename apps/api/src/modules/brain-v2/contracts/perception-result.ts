import type { InputModality } from './brain-input';

/**
 * PerceptionResult
 *
 * The output of the Perception Layer. Represents a fully normalized,
 * validated, and sanitized version of the raw BrainInput.
 *
 * Perception performs ZERO reasoning. It only prepares input for
 * downstream cognitive systems (Attention, Working Memory).
 */
export interface PerceptionResult {
  /** Original session identifier, propagated unchanged. */
  sessionId: string;

  /** Original user identifier, propagated unchanged. */
  userId: string;

  /**
   * Sanitized and normalized input text.
   * - Whitespace collapsed
   * - Encoding normalized to UTF-8
   * - Maximum token budget enforced (excess trimmed with truncation marker)
   * - Unsafe content stripped
   */
  normalizedInput: string;

  /** Confirmed modality after detection. */
  modality: InputModality;

  /** Detected language code (BCP 47). Default: 'en'. */
  languageCode: string;

  /**
   * Estimated token count of normalizedInput.
   * Used by Working Memory to manage context window budget.
   */
  estimatedTokens: number;

  /**
   * True if the input was truncated due to token budget enforcement.
   * Downstream systems should handle partial input gracefully.
   */
  wasTruncated: boolean;

  /**
   * Detected code blocks (if any) extracted from the input.
   * Useful for the Attention system to classify TECHNICAL intent.
   */
  codeBlocks: string[];

  /**
   * Referenced attachment identifiers (file paths, URLs, etc.)
   * extracted from the input by the message parser.
   */
  attachmentRefs: string[];

  /** Original wall-clock timestamp from BrainInput. */
  timestamp: Date;

  /** Wall-clock time the Perception Layer completed normalization. */
  perceivedAt: Date;
}
