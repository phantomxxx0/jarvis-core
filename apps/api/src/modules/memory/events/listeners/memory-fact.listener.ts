import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MemoryEvents } from '../memory-events.enum';
import { SemanticMemoryService } from '../../semantic/semantic-memory.service';

@Injectable()
export class MemoryFactListener {
  private readonly logger = new Logger(MemoryFactListener.name);

  constructor(private readonly semanticMemory: SemanticMemoryService) {}

  @OnEvent(MemoryEvents.MEMORY_FACT_EXTRACTED)
  async handleFactExtracted(payload: any) {
    this.logger.log(
      `Received memory fact extracted event for user ${payload.userId}`,
    );

    if (!payload.userId || !payload.fact) {
      this.logger.warn('Invalid payload: Missing userId or fact');
      return;
    }

    try {
      await this.semanticMemory.store({
        userId: payload.userId,
        conversationId: payload.conversationId || 'autonomous',
        data: {
          fact: payload.fact,
          category: payload.category,
          confidence: payload.confidence,
        },
      });
      this.logger.log(`Successfully stored fact for user ${payload.userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to store fact: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
