import { Injectable } from '@nestjs/common';
import type { BrainInput, InputModality } from '../contracts/brain-input';

/**
 * ModalityDetector
 *
 * Confirms and resolves the InputModality of a BrainInput.
 * The modality may already be set by the caller, but this detector
 * validates and corrects it based on metadata signals.
 *
 * Performs ZERO reasoning. Pure signal detection.
 */
@Injectable()
export class ModalityDetector {
  /**
   * Resolves the effective InputModality from a BrainInput.
   *
   * Resolution priority:
   *  1. Explicit modality from input (if valid).
   *  2. Metadata signals (e.g., voice confidence score present → voice).
   *  3. Default to 'text'.
   *
   * @param input - The BrainInput to inspect.
   * @returns The resolved InputModality.
   */
  detect(input: BrainInput): InputModality {
    const declared = input.modality;

    // Accept the declared modality if it is a known valid value.
    const validModalities: InputModality[] = [
      'text',
      'voice',
      'vision',
      'cli',
      'api',
      'robotics',
      'iot',
      'multimodal',
    ];

    if (validModalities.includes(declared)) {
      return declared;
    }

    // Fallback: inspect metadata for voice signals.
    if (input.metadata?.['voiceConfidence'] !== undefined) {
      return 'voice';
    }

    // Fallback: inspect for image signals.
    if (
      input.metadata?.['mimeType'] &&
      String(input.metadata['mimeType']).startsWith('image/')
    ) {
      return 'vision';
    }

    // Fallback: inspect for robotics sensor signals.
    if (input.metadata?.['sensorId'] !== undefined) {
      return 'robotics';
    }

    // Default to text.
    return 'text';
  }
}
