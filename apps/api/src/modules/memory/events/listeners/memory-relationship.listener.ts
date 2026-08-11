import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MemoryEvents } from '../memory-events.enum';
import { GraphMemoryService } from '../../graph/graph-memory.service';

@Injectable()
export class MemoryRelationshipListener {
  private readonly logger = new Logger(MemoryRelationshipListener.name);

  constructor(private readonly graphMemory: GraphMemoryService) {}

  @OnEvent(MemoryEvents.MEMORY_RELATIONSHIP_EXTRACTED)
  async handleRelationshipExtracted(payload: any) {
    this.logger.log(
      `Received memory relationship extracted event for user ${payload.userId}`,
    );

    if (!payload.userId || !payload.entities || !payload.relationships) {
      this.logger.warn(
        'Invalid payload: Missing userId, entities, or relationships',
      );
      return;
    }

    try {
      await this.graphMemory.store({
        userId: payload.userId,
        conversationId: payload.conversationId || 'autonomous',
        data: {
          entities: payload.entities,
          relationships: payload.relationships,
        },
      });
      this.logger.log(
        `Successfully stored relationships for user ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to store relationships: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
