import { Injectable, Logger } from '@nestjs/common';
import {
  IMemoryService,
  MemoryContext,
  MemoryRankParams,
  MemoryRetrievalParams,
  MemoryStoreParams,
  MemoryUpdateParams,
} from '../interfaces/memory-service.interface';
import { EpisodeRepository } from './episode.repository';

export interface EpisodicMemoryData {
  id?: string;
  title: string;
  summary: string;
  participants?: string[];
  importance?: number;
}

@Injectable()
export class EpisodicMemoryService implements IMemoryService<EpisodicMemoryData> {
  private readonly logger = new Logger(EpisodicMemoryService.name);

  constructor(private readonly episodeRepo: EpisodeRepository) {}

  async store(
    params: MemoryStoreParams<EpisodicMemoryData>,
  ): Promise<EpisodicMemoryData> {
    await this.episodeRepo.create({
      userId: params.userId,
      conversationId: params.conversationId,
      title: params.data.title,
      summary: params.data.summary,
      participants: params.data.participants,
      importance: params.data.importance,
    });
    return params.data;
  }

  async retrieve(params: MemoryRetrievalParams): Promise<EpisodicMemoryData[]> {
    const episodes = await this.episodeRepo.search(
      params.userId,
      params.query,
      params.limit,
    );
    return episodes.map((ep) => ({
      id: ep.id,
      title: ep.title,
      summary: ep.summary,
      participants: ep.participants as string[],
      importance: ep.importance,
    }));
  }

  async update(
    params: MemoryUpdateParams<EpisodicMemoryData>,
  ): Promise<EpisodicMemoryData> {
    throw new Error('Method not implemented.');
  }

  async rank(params: MemoryRankParams): Promise<number> {
    return 100;
  }

  async summarize(memoryIds: string[]): Promise<string> {
    return 'Episodic memory summary stub';
  }

  async composeContext(
    params: MemoryRetrievalParams,
  ): Promise<MemoryContext[]> {
    const data = await this.retrieve(params);
    return data.map((ep) => ({
      content: `Episode: ${ep.title} - ${ep.summary}`,
      source: 'EpisodicMemory',
      confidence: 85,
      memoryId: ep.id,
    }));
  }
}
