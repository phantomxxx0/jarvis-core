import { Injectable } from '@nestjs/common';
import { BaseExtractor } from './base.extractor';
import { WorkerRegistryService } from '../../workers/registry/worker-registry.service';

@Injectable()
export class ProcedureExtractor extends BaseExtractor {
  constructor(workerRegistry: WorkerRegistryService) {
    super(workerRegistry);
  }

  get type(): string {
    return 'PROCEDURE';
  }

  get systemPrompt(): string {
    return 'Extract step-by-step procedures or workflows from the conversation. Return a JSON array of objects with { "title": "procedure name", "description": "summary", "steps": [{ "stepOrder": number, "instruction": "do this", "command": "optional cli command" }], "confidence": "integer (0-100)" }';
  }
}
