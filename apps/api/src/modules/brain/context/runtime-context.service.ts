import { Injectable, Logger } from '@nestjs/common';
import { ContextBuilder } from './context.builder';
import {
  RuntimeSnapshotService,
  RuntimeSnapshot,
} from '../../runtime/services/runtime-snapshot.service';

export interface RuntimeContextPayload {
  contextText: string;
  clusterState: RuntimeSnapshot;
  metrics: {
    retrievedAt: Date;
    sectionsUsed: number;
    textLength: number;
  };
}

@Injectable()
export class RuntimeContextService {
  private readonly logger = new Logger(RuntimeContextService.name);

  constructor(
    private readonly contextBuilder: ContextBuilder,
    private readonly runtimeSnapshot: RuntimeSnapshotService,
  ) {}

  public async buildRuntimeContext(
    query: string,
    userId = 'system',
  ): Promise<RuntimeContextPayload> {
    this.logger.debug(
      `Building runtime context for query: "${query}" | user: ${userId}`,
    );

    // 1. Gather environmental state from context providers (Memory, World, Personal)
    // The ContextBuilder will automatically invoke all registered CONTEXT_PROVIDERS
    const contextBundle = await this.contextBuilder.buildUnifiedContext(query);

    // 2. Gather capability definitions and runtime snapshot
    const clusterState = this.runtimeSnapshot.generateSnapshot();

    return {
      contextText: contextBundle.text,
      clusterState,
      metrics: {
        retrievedAt: contextBundle.retrievedAt,
        sectionsUsed: contextBundle.sections.length,
        textLength: contextBundle.text.length,
      },
    };
  }
}
