import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InferSelectModel } from 'drizzle-orm';
import { memories } from '@jarvis/database';

import { BrainEvent } from '../events/enums/brain-event.enum';
import { MemoryIndexService } from '../../memories/services/memory-index.service';

type Memory = InferSelectModel<typeof memories>;

@Injectable()
export class BrainEventListener {
  private readonly logger = new Logger(BrainEventListener.name);

  constructor(private readonly memoryIndexService: MemoryIndexService) {}

  @OnEvent(BrainEvent.MEMORY_STORED)
  async handleMemoryStoredEvent(payload: { memory: Memory }) {
    this.logger.log(
      `Handling MEMORY_STORED event for memory ${payload.memory.id}`,
    );

    try {
      await this.memoryIndexService.index(payload.memory);
    } catch (error) {
      this.logger.error(`Failed to index memory ${payload.memory.id}`, error);
    }
  }
}
