import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { MemoryEvents } from '../events/memory-events.enum';
import { ExtractionPipelineService } from '../extractors/extraction-pipeline.service';
import { MemoryValidatorService } from '../validation/memory-validator.service';
import { ConversationsService } from '../../conversations/conversations.service';

export interface ConversationTurnCreatedEvent {
  conversationId: string;
  userId: string;
  userMessageId: string;
  assistantMessageId: string;
  userMessage: string;
  assistantMessage: string;
  createdAt: Date;
}

@Injectable()
export class MemoryOrchestratorService {
  private readonly logger = new Logger(MemoryOrchestratorService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly extractionPipeline: ExtractionPipelineService,
    private readonly validator: MemoryValidatorService,
    private readonly conversationsService: ConversationsService,
  ) {}

  @OnEvent(MemoryEvents.CONVERSATION_MESSAGE_CREATED)
  async handleConversation(event: ConversationTurnCreatedEvent) {
    this.logger.log(
      `Received conversation turn, coordinating extraction: ${event.conversationId || 'N/A'}`,
    );

    // 1. Extract directly from the emitted payload turn
    const conversationHistory = `User:\n${event.userMessage}\n\nAssistant:\n${event.assistantMessage}`;

    const rawMemories = await this.extractionPipeline.extractAll(
      conversationHistory,
      '',
    );

    if (rawMemories.length === 0) {
      return;
    }

    // 2. Validation
    const validatedMemories = this.validator.validate(rawMemories);

    // 3. Routing / Persistence
    // The orchestrator emits events for specific memory domains to handle their own storage
    for (const memory of validatedMemories) {
      switch (memory.type) {
        case 'PROJECT':
          this.eventEmitter.emit('memory.project.extracted', {
            userId: event.userId,
            ...memory.data,
          });
          break;
        case 'DEVICE':
          this.eventEmitter.emit('memory.device.extracted', {
            userId: event.userId,
            ...memory.data,
          });
          break;
        case 'FACT':
          this.eventEmitter.emit('memory.fact.extracted', {
            userId: event.userId,
            ...memory.data,
          });
          break;
        case 'EPISODE':
          this.eventEmitter.emit('memory.episode.extracted', {
            userId: event.userId,
            ...memory.data,
          });
          break;
        case 'GOAL':
          this.eventEmitter.emit('memory.goal.extracted', {
            userId: event.userId,
            ...memory.data,
          });
          break;
        case 'PREFERENCE':
          this.eventEmitter.emit('memory.preference.extracted', {
            userId: event.userId,
            ...memory.data,
          });
          break;
        case 'RELATIONSHIP':
          this.eventEmitter.emit('memory.relationship.extracted', {
            userId: event.userId,
            ...memory.data,
          });
          break;
        case 'PROCEDURE':
          this.eventEmitter.emit('memory.procedure.extracted', {
            userId: event.userId,
            ...memory.data,
          });
          break;
        default:
          this.logger.debug(
            `Extracted memory of type ${memory.type} but no routing logic exists yet`,
          );
      }
    }
  }
}
