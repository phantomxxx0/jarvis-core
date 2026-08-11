import { Injectable } from '@nestjs/common';
import { BaseExtractor } from './base.extractor';
import { WorkerRegistryService } from '../../workers/registry/worker-registry.service';

@Injectable()
export class PreferenceExtractor extends BaseExtractor {
  constructor(workerRegistry: WorkerRegistryService) {
    super(workerRegistry);
  }

  get type(): string {
    return 'PREFERENCE';
  }

  get systemPrompt(): string {
    return 'Extract user preferences from the conversation. Return a JSON array of objects with{ "category": "preference category", "key": "preference name", "value": "preference value", "confidence": "integer (0-100)" }';
  }
}
