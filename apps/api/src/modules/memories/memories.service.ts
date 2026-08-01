import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  CreateMemoryData,
  MemoriesRepository,
  UpdateMemoryData,
} from './repositories/memories.repository';

import { MemoryIndexService } from './services/memory-index.service';

@Injectable()
export class MemoriesService {
  constructor(
    private readonly memoriesRepository: MemoriesRepository,
    private readonly memoryIndexService: MemoryIndexService,
  ) {}

  /**
   * Store a memory in PostgreSQL.
   *
   * Semantic indexing is handled separately by
   * MemoryIndexService.
   */
  async create(data: CreateMemoryData) {
    return this.memoriesRepository.create(data);
  }

  async findById(
    userId: string,
    memoryId: string,
  ) {
    const memory =
      await this.memoriesRepository.findById(
        memoryId,
      );

    if (!memory || memory.userId !== userId) {
      throw new NotFoundException(
        'Memory not found',
      );
    }

    return memory;
  }

  findByUserId(userId: string) {
    return this.memoriesRepository.findByUserId(
      userId,
    );
  }

  async update(
    userId: string,
    memoryId: string,
    data: UpdateMemoryData,
  ) {
    await this.findById(
      userId,
      memoryId,
    );

    return this.memoriesRepository.update(
      memoryId,
      data,
    );
  }

  async archive(
    userId: string,
    memoryId: string,
  ) {
    await this.findById(
      userId,
      memoryId,
    );

    return this.memoriesRepository.archive(
      memoryId,
    );
  }

  async updateLastAccessed(
    userId: string,
    memoryId: string,
  ) {
    await this.findById(
      userId,
      memoryId,
    );

    return this.memoriesRepository.updateLastAccessed(
      memoryId,
    );
  }

  /**
   * Delegate semantic search to MemoryIndexService.
   */
  async searchSimilar(
    userId: string,
    query: string,
    limit = 5,
  ) {
    return this.memoryIndexService.searchSimilar(
      userId,
      query,
      limit,
    );
  }
}
