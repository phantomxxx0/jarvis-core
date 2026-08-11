import { Injectable, Logger } from '@nestjs/common';

import { WorkerKind } from '../../workers/enums/worker-kind.enum';

@Injectable()
export class TaskRouterService {
  private readonly logger = new Logger(TaskRouterService.name);

  resolve(capabilityRequired: string): WorkerKind {
    this.logger.log(
      `Resolving worker kind for capability: ${capabilityRequired}`,
    );

    if (capabilityRequired === 'direct_llm_response') {
      throw new Error(
        `Internal action should not be routed: ${capabilityRequired}`,
      );
    }

    switch (capabilityRequired) {
      case 'CHAT':
      case 'REASONING':
      case 'INFERENCE':
        return WorkerKind.INFERENCE;

      case 'EMBEDDING':
        return WorkerKind.EMBEDDING;

      default:
        throw new Error(`Unsupported capability: ${capabilityRequired}`);
    }
  }
}
