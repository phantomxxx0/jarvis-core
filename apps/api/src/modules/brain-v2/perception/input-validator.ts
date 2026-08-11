import { Injectable, Logger } from '@nestjs/common';
import type { BrainInput } from '../contracts/brain-input';

/**
 * InputValidator
 *
 * First gate of the Perception Layer. Guards against malformed,
 * empty, or oversized inputs before any processing occurs.
 *
 * Performs ZERO reasoning. Pure validation only.
 */
@Injectable()
export class InputValidator {
  private readonly logger = new Logger(InputValidator.name);

  /** Absolute maximum input length in characters. */
  private readonly ABSOLUTE_MAX_CHARS = 100_000;

  /** Minimum input length in characters to be considered valid. */
  private readonly MIN_CHARS = 1;

  /**
   * Validates a BrainInput.
   *
   * @param input - The raw input to validate.
   * @returns An object with `valid` flag and optional `reason` for rejection.
   */
  validate(input: BrainInput): { valid: boolean; reason?: string } {
    if (!input.rawInput || input.rawInput.trim().length < this.MIN_CHARS) {
      this.logger.warn(
        `[InputValidator] Rejected empty input for user=${input.userId}`,
      );
      return { valid: false, reason: 'Input is empty or whitespace-only.' };
    }

    if (input.rawInput.length > this.ABSOLUTE_MAX_CHARS) {
      this.logger.warn(
        `[InputValidator] Rejected oversized input (${input.rawInput.length} chars) for user=${input.userId}`,
      );
      return {
        valid: false,
        reason: `Input exceeds maximum allowed length of ${this.ABSOLUTE_MAX_CHARS} characters.`,
      };
    }

    if (!input.userId || input.userId.trim().length === 0) {
      this.logger.warn('[InputValidator] Rejected input with missing userId.');
      return { valid: false, reason: 'userId is required.' };
    }

    if (!input.sessionId || input.sessionId.trim().length === 0) {
      this.logger.warn(
        '[InputValidator] Rejected input with missing sessionId.',
      );
      return { valid: false, reason: 'sessionId is required.' };
    }

    return { valid: true };
  }
}
