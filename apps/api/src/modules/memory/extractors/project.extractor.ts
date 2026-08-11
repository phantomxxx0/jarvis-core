import { Injectable } from '@nestjs/common';
import { BaseExtractor } from './base.extractor';
import { WorkerRegistryService } from '../../workers/registry/worker-registry.service';

@Injectable()
export class ProjectExtractor extends BaseExtractor {
  constructor(workerRegistry: WorkerRegistryService) {
    super(workerRegistry);
  }

  get type(): string {
    return 'PROJECT';
  }

  get systemPrompt(): string {
    return 'Extract coding or business projects from the conversation. Return a JSON array of objects with { "name": "project name", "description": "project description", "status": "ACTIVE or ARCHIVED", "repositoryUrl": "optional URL", "confidence": "integer (0-100)" }';
  }
}
