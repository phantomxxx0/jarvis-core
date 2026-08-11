import { Injectable, Logger } from '@nestjs/common';
import { ExtractedMemory } from '../extractors/memory-extractor.interface';

@Injectable()
export class MemoryValidatorService {
  private readonly logger = new Logger(MemoryValidatorService.name);

  /**
   * Deterministically validates, normalizes, and filters extracted memories.
   */
  validate(memories: ExtractedMemory[]): ExtractedMemory[] {
    this.logger.log(
      `Starting validation for ${memories.length} extracted memories`,
    );

    let validated = this.rejectLowConfidence(memories);
    validated = this.normalizeEntities(validated);
    validated = this.removeDuplicates(validated);
    // Add additional deterministic validation logic here (conflict detection, etc.)

    this.logger.log(
      `Validation complete: ${validated.length} memories retained`,
    );
    return validated;
  }

  private rejectLowConfidence(memories: ExtractedMemory[]): ExtractedMemory[] {
    const MIN_CONFIDENCE = 50; // Threshold
    return memories.filter((m) => {
      if (m.confidence !== undefined && m.confidence < MIN_CONFIDENCE) {
        this.logger.debug(
          `Rejecting low confidence memory: ${JSON.stringify(m)}`,
        );
        return false;
      }
      return true;
    });
  }

  private normalizeEntities(memories: ExtractedMemory[]): ExtractedMemory[] {
    return memories.map((m) => {
      // Normalize common string fields if they exist
      const normalizedData = { ...m.data };
      if (typeof normalizedData.name === 'string') {
        normalizedData.name = normalizedData.name.trim();
      }
      if (typeof normalizedData.title === 'string') {
        normalizedData.title = normalizedData.title.trim();
      }
      return { ...m, data: normalizedData };
    });
  }

  private removeDuplicates(memories: ExtractedMemory[]): ExtractedMemory[] {
    const unique = new Map<string, ExtractedMemory>();
    for (const m of memories) {
      // Create a deterministic hash/key of the data to find exact duplicates
      const key = `${m.type}:${JSON.stringify(m.data)}`;
      if (!unique.has(key)) {
        unique.set(key, m);
      } else {
        // If it exists, we could merge aliases or keep the one with higher confidence
        const existing = unique.get(key)!;
        if ((m.confidence ?? 0) > (existing.confidence ?? 0)) {
          unique.set(key, m);
        }
      }
    }
    return Array.from(unique.values());
  }
}
