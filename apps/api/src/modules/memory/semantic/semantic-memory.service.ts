import { Injectable, Logger } from '@nestjs/common';
import {
  IMemoryService,
  MemoryContext,
  MemoryRankParams,
  MemoryRetrievalParams,
  MemoryStoreParams,
  MemoryUpdateParams,
} from '../interfaces/memory-service.interface';
import { MemoriesService } from '../../memories/memories.service';

export interface SemanticMemoryData {
  id?: string;
  fact: string;
  category?: string;
  confidence?: number;
}

@Injectable()
export class SemanticMemoryService implements IMemoryService<SemanticMemoryData> {
  private readonly logger = new Logger(SemanticMemoryService.name);

  constructor(private readonly memoriesService: MemoriesService) {}

  async store(
    params: MemoryStoreParams<SemanticMemoryData>,
  ): Promise<SemanticMemoryData> {
    await this.memoriesService.create({
      userId: params.userId,
      type: 'SEMANTIC_FACT',
      origin: 'MEMORY_ORCHESTRATOR',
      content: params.data.fact,
      metadata: { category: params.data.category },
      importance: params.data.confidence ?? 80,
    });
    return params.data;
  }

  async retrieve(params: MemoryRetrievalParams): Promise<SemanticMemoryData[]> {
    const results = await this.memoriesService.searchSimilar(
      params.userId,
      params.query,
      params.limit,
    );
    return results.map((r) => ({
      id: r.id as string,
      fact: r.payload?.content as string,
      confidence: r.score, // assuming score represents confidence/relevance
      category: (r.payload?.metadata as any)?.category,
    }));
  }

  async update(
    params: MemoryUpdateParams<SemanticMemoryData>,
  ): Promise<SemanticMemoryData> {
    throw new Error('Method not implemented.');
  }

  async rank(params: MemoryRankParams): Promise<number> {
    return 100;
  }

  async summarize(memoryIds: string[]): Promise<string> {
    return 'Semantic memory summary stub';
  }

  async composeContext(
    params: MemoryRetrievalParams,
  ): Promise<MemoryContext[]> {
    const data = await this.retrieve(params);
    return data.map((d) => ({
      content: `Fact: ${d.fact}`,
      source: 'SemanticMemory',
      confidence: d.confidence ?? 90,
      memoryId: d.id,
    }));
  }
}
