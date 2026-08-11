import { Injectable } from '@nestjs/common';
import { BaseExtractor } from './base.extractor';
import { WorkerRegistryService } from '../../workers/registry/worker-registry.service';

@Injectable()
export class RelationshipExtractor extends BaseExtractor {
  constructor(workerRegistry: WorkerRegistryService) {
    super(workerRegistry);
  }

  get type(): string {
    return 'RELATIONSHIP';
  }

  get systemPrompt(): string {
    return 'Extract relationships between entities (e.g. people, companies, tools) from the conversation. Never infer, guess, or assume based on outside knowledge. Extract only explicitly stated connections. Return a JSON array of objects with { "from": "entity name", "relation": "relationship type like BROTHER or OWNS", "to": "entity name", "confidence": "integer (0-100)" }';
  }
}
