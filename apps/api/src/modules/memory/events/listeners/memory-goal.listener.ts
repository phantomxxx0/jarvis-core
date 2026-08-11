import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MemoryEvents } from '../memory-events.enum';
import { GoalMemoryService } from '../../adapters/goal-memory.service';

@Injectable()
export class MemoryGoalListener {
  private readonly logger = new Logger(MemoryGoalListener.name);

  constructor(private readonly goalMemory: GoalMemoryService) {}

  @OnEvent(MemoryEvents.MEMORY_GOAL_EXTRACTED)
  async handleGoalExtracted(payload: any) {
    this.logger.log(
      `Received memory goal extracted event for user ${payload.userId}`,
    );

    if (!payload.userId || !payload.title) {
      this.logger.warn('Invalid payload: Missing userId or title');
      return;
    }

    try {
      await this.goalMemory.store({
        userId: payload.userId,
        conversationId: payload.conversationId || 'autonomous',
        data: {
          title: payload.title,
          description: payload.description,
          status: payload.status || 'ACTIVE',
          deadlineAt: payload.deadlineAt,
        },
      });
      this.logger.log(`Successfully stored goal for user ${payload.userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to store goal: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
