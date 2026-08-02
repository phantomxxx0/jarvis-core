import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ContextPayload } from '../contracts/context-payload';
import { BrainEvent } from '../events/enums/brain-event.enum';

import { ConversationsService } from '../../conversations/conversations.service';
import { MemoryIndexService } from '../../memories/services/memory-index.service';

@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly memoryIndexService: MemoryIndexService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async buildContext(userId: string, query: string): Promise<ContextPayload> {
    this.logger.log(`Building immutable context for user ${userId}...`);

    const history = await this.conversationsService.getRecentMessages(
      userId,
      10,
    );

    const memories = await this.memoryIndexService.searchSimilar(
      userId,
      query,
      5,
    );

    const semanticMemories = memories.map((memory) => ({
      id: String(memory.id),
      score: memory.score ?? 0,
      content:
        typeof memory.payload?.content === 'string'
          ? memory.payload.content
          : '',
    }));

    const payload: ContextPayload = {
      history,
      semanticMemories,
      systemState: {
        timestamp: new Date().toISOString(),
      },
    };

    // Note: The context payload is deeply read-only by TS contracts.

    this.eventEmitter.emit(BrainEvent.CONTEXT_BUILT, { userId, query });

    this.logger.log(`Context built successfully for user ${userId}.`);

    return Object.freeze(payload);
  }
}
