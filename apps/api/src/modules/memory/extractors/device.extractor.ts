import { Injectable } from '@nestjs/common';
import { BaseExtractor } from './base.extractor';
import { WorkerRegistryService } from '../../workers/registry/worker-registry.service';

@Injectable()
export class DeviceExtractor extends BaseExtractor {
  constructor(workerRegistry: WorkerRegistryService) {
    super(workerRegistry);
  }

  get type(): string {
    return 'DEVICE';
  }

  get systemPrompt(): string {
    return 'Extract hardware devices or environments from the conversation. Return a JSON array of objects with { "deviceName": "name of device", "deviceType": "type e.g. LAPTOP, SERVER", "confidence": "integer (0-100)" }';
  }
}
