import { Injectable, Logger } from '@nestjs/common';
import { MemoryExtractor, ExtractedMemory } from './memory-extractor.interface';
import { WorkerRegistryService } from '../../workers/registry/worker-registry.service';
import { WorkerKind } from '../../workers/enums/worker-kind.enum';
import { extractAndParseJson } from '../../../utils/json.util';

/**
 * Normalizes an arbitrary LLM-returned confidence value onto a strict
 * 0-100 integer scale. Never trust the model to honor the contract.
 *
 *   0.83   -> 83
 *   83     -> 83
 *   "85"   -> 85
 *   "0.85" -> 85
 *   120    -> 100
 *   -15    -> 0
 *   NaN    -> 80
 *   null   -> 80
 */
export function normalizeConfidence(value: unknown): number {
  if (value === null || value === undefined) return 80;

  let c = Number(value);

  if (Number.isNaN(c)) return 80;

  if (c <= 1) c *= 100;

  return Math.max(0, Math.min(100, Math.round(c)));
}

@Injectable()
export abstract class BaseExtractor implements MemoryExtractor {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly workerRegistry: WorkerRegistryService) {}

  abstract get type(): string;
  abstract get systemPrompt(): string;

  async extract(
    conversation: string,
    context: string,
  ): Promise<ExtractedMemory[]> {
    try {
      const workers = await this.workerRegistry.discover({
        kind: WorkerKind.INFERENCE,
      });
      if (workers.length === 0) {
        this.logger.warn('No inference workers available for extraction');
        return [];
      }

      const worker = workers[0];
      const prompt = `${this.systemPrompt}\n\nContext:\n${context}\n\nConversation:\n${conversation}\n\nExtract and return JSON array of memories of type ${this.type}. If none, return [].`;

      const result = await worker.execute<any, any>({
        prompt,
        temperature: 0.1,
        jsonMode: true,
      });

      if (result && result.success && result.data) {
        let parsed = result.data;
        if (typeof parsed === 'string') {
          try {
            parsed = extractAndParseJson<any>(parsed);
          } catch (e) {
            this.logger.error(`Failed to parse extraction output: ${parsed}`);
            return [];
          }
        }

        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            type: this.type,
            data: item,
            confidence: normalizeConfidence(item.confidence),
          }));
        }
      }
      return [];
    } catch (error) {
      this.logger.error(`Extraction failed: ${(error as Error).message}`);
      return [];
    }
  }
}
