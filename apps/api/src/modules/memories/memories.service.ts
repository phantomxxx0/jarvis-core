import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { AIService } from '../ai/ai.service';
import { QdrantProvider } from '../ai/providers/qdrant.provider';

import {
  CreateMemoryData,
  MemoriesRepository,
  UpdateMemoryData,
} from './repositories/memories.repository';

@Injectable()
export class MemoriesService {
  private readonly logger = new Logger(MemoriesService.name);

  constructor(
    private readonly memoriesRepository: MemoriesRepository,
    private readonly aiService: AIService,
    private readonly qdrantProvider: QdrantProvider,
  ) {}

  async create(data: CreateMemoryData) {
    // 1. Save to PostgreSQL first
    const memory = await this.memoriesRepository.create(data);

    // 2. Best-effort semantic indexing
    try {
      const embedding = await this.aiService.embed(memory.content);

      this.logger.log(
        `Embedding generated. Dimension: ${embedding.length}`,
      );

      await this.qdrantProvider.upsertMemory(
        memory.id,
        embedding,
        {
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
        },
      );

      this.logger.log('Qdrant upsert completed.');

      this.logger.log(
        `Memory ${memory.id} indexed successfully.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to index memory ${memory.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return memory;
  }

  async findById(userId: string, memoryId: string) {
    const memory = await this.memoriesRepository.findById(memoryId);

    if (!memory || memory.userId !== userId) {
      throw new NotFoundException('Memory not found');
    }

    return memory;
  }

  findByUserId(userId: string) {
    return this.memoriesRepository.findByUserId(userId);
  }

  async update(
    userId: string,
    memoryId: string,
    data: UpdateMemoryData,
  ) {
    await this.findById(userId, memoryId);

    return this.memoriesRepository.update(memoryId, data);
  }

  async archive(userId: string, memoryId: string) {
    await this.findById(userId, memoryId);

    return this.memoriesRepository.archive(memoryId);
  }

  async updateLastAccessed(
    userId: string,
    memoryId: string,
  ) {
    await this.findById(userId, memoryId);

    return this.memoriesRepository.updateLastAccessed(
      memoryId,
    );
  }
  async searchSimilar(
  userId: string,
  query: string,
  limit = 5,
) {
  // Generate embedding for the query
  const embedding = await this.aiService.embed(query);

  this.logger.log(
    `Searching semantic memories for user ${userId}`,
  );

  // Search only this user's memories
  const results = await this.qdrantProvider.searchMemory(
    embedding,
    limit,
    {
      userId,
    },
  );

  this.logger.log(
    `Found ${results.length} semantic memories.`,
  );

  return results;
}

}
