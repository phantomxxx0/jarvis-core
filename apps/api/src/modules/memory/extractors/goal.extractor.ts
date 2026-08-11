import { Injectable } from '@nestjs/common';
import { BaseExtractor } from './base.extractor';
import { WorkerRegistryService } from '../../workers/registry/worker-registry.service';

@Injectable()
export class GoalExtractor extends BaseExtractor {
  constructor(workerRegistry: WorkerRegistryService) {
    super(workerRegistry);
  }

  get type(): string {
    return 'GOAL';
  }

  get systemPrompt(): string {
    return 'Extract user goals or tasks from the conversation. Return a JSON array of objects with { "title": "goal title", "description": "goal description", "status": "ACTIVE or COMPLETED", "confidence": "integer (0-100)" }';
  }
}
