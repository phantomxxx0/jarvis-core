import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MemoryEvents } from '../memory-events.enum';
import { EpisodicMemoryService } from '../../episodic/episodic-memory.service';

@Injectable()
export class MemoryEpisodeListener {
  private readonly logger = new Logger(MemoryEpisodeListener.name);

  constructor(private readonly episodicMemory: EpisodicMemoryService) {}

  @OnEvent(MemoryEvents.MEMORY_EPISODE_EXTRACTED)
  async handleEpisodeExtracted(payload: any) {
    this.logger.log(
      `Received memory episode extracted event for user ${payload.userId}`,
    );

    if (!payload.userId || !payload.title || !payload.summary) {
      this.logger.warn('Invalid payload: Missing userId, title, or summary');
      return;
    }

    try {
      await this.episodicMemory.store({
        userId: payload.userId,
        conversationId: payload.conversationId || 'autonomous',
        data: {
          title: payload.title,
          summary: payload.summary,
          participants: payload.participants,
          importance: payload.importance,
        },
      });
      this.logger.log(`Successfully stored episode for user ${payload.userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to store episode: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
