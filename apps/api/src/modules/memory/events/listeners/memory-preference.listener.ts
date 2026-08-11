import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MemoryEvents } from '../memory-events.enum';
import { PreferenceMemoryService } from '../../adapters/preference-memory.service';

@Injectable()
export class MemoryPreferenceListener {
  private readonly logger = new Logger(MemoryPreferenceListener.name);

  constructor(private readonly preferenceMemory: PreferenceMemoryService) {}

  @OnEvent(MemoryEvents.MEMORY_PREFERENCE_EXTRACTED)
  async handlePreferenceExtracted(payload: any) {
    this.logger.log(
      `Received memory preference extracted event for user ${payload.userId}`,
    );

    if (!payload.userId || !payload.key || !payload.value) {
      this.logger.warn('Invalid payload: Missing userId, key, or value');
      return;
    }

    try {
      await this.preferenceMemory.store({
        userId: payload.userId,
        conversationId: payload.conversationId || 'autonomous',
        data: {
          category: payload.category || 'GENERAL',
          key: payload.key,
          value: payload.value,
          confidence: payload.confidence,
        },
      });
      this.logger.log(
        `Successfully stored preference for user ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to store preference: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
