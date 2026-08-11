import { Injectable } from '@nestjs/common';
import { truncateToTokenBudget } from '../utils/token-counter';

/**
 * NormalizedText
 *
 * Result of the InputNormalizer's processing.
 */
export interface NormalizedText {
  /** The fully sanitized and normalized text. */
  text: string;

  /** True if the original input was truncated to fit the token budget. */
  wasTruncated: boolean;

  /** Detected language code (BCP 47). Defaults to 'en'. */
  languageCode: string;
}

/**
 * InputNormalizer
 *
 * Sanitizes and normalizes raw input text.
 * Responsibilities:
 *  - Normalize Unicode (NFC normalization)
 *  - Collapse excessive whitespace
 *  - Remove null bytes and control characters
 *  - Enforce token budget (truncate if needed)
 *  - Detect language code (heuristic, Phase 1)
 *
 * Performs ZERO reasoning. Pure text transformation.
 */
@Injectable()
export class InputNormalizer {
  /** Maximum token budget for normalized text. */
  private readonly MAX_TOKENS = 8_000;

  /**
   * Normalizes a raw input string.
   *
   * @param raw - The raw input string from BrainInput.rawInput.
   * @returns A NormalizedText with the clean text and metadata.
   */
  normalize(raw: string): NormalizedText {
    // Step 1: NFC normalization (canonical Unicode form).
    let text = raw.normalize('NFC');

    // Step 2: Remove null bytes and non-printable control characters
    // (except newlines, tabs — which are meaningful in code).
    text = text
      .replace(/\0/g, '')
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Step 3: Normalize line endings to \n.
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Step 4: Collapse runs of 3+ blank lines into 2.
    text = text.replace(/\n{3,}/g, '\n\n');

    // Step 5: Collapse runs of whitespace within lines (preserve newlines).
    text = text
      .split('\n')
      .map((line: string) => line.replace(/[ \t]+/g, ' ').trimEnd())
      .join('\n');

    // Step 6: Trim leading/trailing whitespace from the entire string.
    text = text.trim();

    // Step 7: Enforce token budget.
    const { text: budgetedText, wasTruncated } = truncateToTokenBudget(
      text,
      this.MAX_TOKENS,
    );

    // Step 8: Heuristic language detection.
    // Phase 1: simple ASCII/Latin check. Phase 2 can use a proper detector.
    const languageCode = this.detectLanguageCode(budgetedText);

    return { text: budgetedText, wasTruncated, languageCode };
  }

  /**
   * Heuristic language detection for Phase 1.
   * Returns 'en' for ASCII-dominant text, 'und' (undetermined) otherwise.
   * Phase 2 will replace this with a proper language detection library.
   */
  private detectLanguageCode(text: string): string {
    const asciiRatio =
      text.split('').filter((c: string) => c.charCodeAt(0) < 128).length /
      Math.max(text.length, 1);
    return asciiRatio > 0.85 ? 'en' : 'und';
  }
}
