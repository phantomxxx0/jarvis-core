import { Injectable, Logger } from '@nestjs/common';

import { QdrantProvider } from '../../ai/providers/qdrant.provider';
import { memories } from '@jarvis/database';
import { InferSelectModel } from 'drizzle-orm';
import { WorkerRegistryService } from '../../workers/registry/worker-registry.service';

type Memory = InferSelectModel<typeof memories>;

@Injectable()
export class MemoryIndexService {
  private readonly logger = new Logger(MemoryIndexService.name);

  constructor(
    private readonly qdrantProvider: QdrantProvider,
    private readonly workerRegistry: WorkerRegistryService,
  ) {}

  async index(memory: Memory): Promise<void> {
    try {
      const worker = await this.workerRegistry.getById('embedding-worker');
      if (!worker) {
        throw new Error('Embedding worker not found in registry');
      }

      const result = await worker.execute({ input: memory.content });
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Embedding generation failed');
      }

      const embedding = result.data as number[];

      this.logger.log(`Embedding generated (${embedding.length}).`);

      await this.qdrantProvider.upsertMemory(memory.id, embedding, {
        userId: memory.userId,
        type: memory.type,
        origin: memory.origin,
        content: memory.content,
        metadata: memory.metadata,
        importance: memory.importance,
        status: memory.status,
        version: memory.version,
        createdAt: memory.createdAt,
        updatedAt: memory.updatedAt,
      });

      this.logger.log(`Memory ${memory.id} indexed.`);
    } catch (error) {
      this.logger.error(
        `Failed to index memory ${memory.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async searchSimilar(userId: string, query: string, limit = 5) {
    const worker = await this.workerRegistry.getById('embedding-worker');
    if (!worker) {
      throw new Error('Embedding worker not found in registry');
    }

    const result = await worker.execute({ input: query });
    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Embedding generation failed');
    }

    const embedding = result.data as number[];

    this.logger.log(`Searching semantic memories for user ${userId}`);

    const results = await this.qdrantProvider.searchMemory(embedding, limit, {
      userId,
    });

    this.logger.log(`Found ${results.length} semantic memories.`);

    return results;
  }
}
