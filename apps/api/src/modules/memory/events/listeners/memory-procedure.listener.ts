import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MemoryEvents } from '../memory-events.enum';
import { ProceduralMemoryService } from '../../procedural/procedural-memory.service';

@Injectable()
export class MemoryProcedureListener {
  private readonly logger = new Logger(MemoryProcedureListener.name);

  constructor(private readonly proceduralMemory: ProceduralMemoryService) {}

  @OnEvent(MemoryEvents.MEMORY_PROCEDURE_EXTRACTED)
  async handleProcedureExtracted(payload: any) {
    this.logger.log(
      `Received memory procedure extracted event for user ${payload.userId}`,
    );

    if (!payload.userId || !payload.title || !payload.steps) {
      this.logger.warn('Invalid payload: Missing userId, title, or steps');
      return;
    }

    try {
      await this.proceduralMemory.store({
        userId: payload.userId,
        conversationId: payload.conversationId || 'autonomous',
        data: {
          title: payload.title,
          description: payload.description,
          steps: payload.steps,
        },
      });
      this.logger.log(
        `Successfully stored procedure for user ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to store procedure: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
