import { Injectable } from '@nestjs/common';
import { BaseExtractor } from './base.extractor';
import { WorkerRegistryService } from '../../workers/registry/worker-registry.service';

@Injectable()
export class FactExtractor extends BaseExtractor {
  constructor(workerRegistry: WorkerRegistryService) {
    super(workerRegistry);
  }

  get type(): string {
    return 'FACT';
  }

  get systemPrompt(): string {
    return 'Extract objective facts from the conversation. Never infer. Never guess. Never assume. Extract only explicitly stated facts. Return a JSON array with objects containing { "fact": "string", "category": "string", "confidence": "integer (0-100)" }';
  }
}
