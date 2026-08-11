import { Injectable } from '@nestjs/common';
import { BaseExtractor } from './base.extractor';
import { WorkerRegistryService } from '../../workers/registry/worker-registry.service';

@Injectable()
export class EpisodeExtractor extends BaseExtractor {
  constructor(workerRegistry: WorkerRegistryService) {
    super(workerRegistry);
  }

  get type(): string {
    return 'EPISODE';
  }

  get systemPrompt(): string {
    return 'Extract chronological episodes or experiences from the conversation. Return a JSON array of objects with { "title": "episode title", "summary": "brief summary", "participants": ["array of names"], "importance": "integer (0-100)", "confidence": "integer (0-100)" }';
  }
}
