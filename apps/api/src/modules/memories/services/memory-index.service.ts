import { Injectable, Logger } from '@nestjs/common';

import { AIRouter } from '../../ai/router/ai.router';
import { QdrantProvider } from '../../ai/providers/qdrant.provider';
import { memories } from '@jarvis/database';
import { InferSelectModel } from 'drizzle-orm';

type Memory = InferSelectModel<typeof memories>;

@Injectable()
export class MemoryIndexService {
  private readonly logger = new Logger(MemoryIndexService.name);

  constructor(
    private readonly aiRouter: AIRouter,
    private readonly qdrantProvider: QdrantProvider,
  ) {}

  async index(memory: Memory): Promise<void> {
    try {
      const embedding = await this.aiRouter.embed(memory.content);

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
    const embedding = await this.aiRouter.embed(query);

    this.logger.log(`Searching semantic memories for user ${userId}`);

    const results = await this.qdrantProvider.searchMemory(embedding, limit, {
      userId,
    });

    this.logger.log(`Found ${results.length} semantic memories.`);

    return results;
  }
}
