import { Injectable } from '@nestjs/common';

import { ChatMessage } from '../ai/interfaces/chat-message.interface';

import {
  ConversationsRepository,
  CreateConversationData,
} from './repositories/conversations.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MemoryEvents } from '../memory/events/memory-events.enum';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly repository: ConversationsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  create(data: CreateConversationData) {
    return this.repository.create(data);
  }

  async saveMessage(userId: string, message: ChatMessage) {
    const saved = await this.repository.create({
      userId,
      role: message.role,
      content: message.content,
    });
    return saved;
  }

  async saveInteractionTurn(
    userId: string,
    userMessage: string,
    assistantMessage: string,
    conversationId?: string,
  ) {
    const { conv, userSaved, assistantSaved } =
      await this.repository.saveInteractionTurn(
        userId,
        userMessage,
        assistantMessage,
        conversationId,
      );

    this.eventEmitter.emit(MemoryEvents.CONVERSATION_MESSAGE_CREATED, {
      conversationId: conv.id,
      userId,
      userMessageId: userSaved.id,
      assistantMessageId: assistantSaved.id,
      userMessage,
      assistantMessage,
      createdAt: userSaved.createdAt,
    });

    return { conv, userSaved, assistantSaved };
  }

  async getRecentMessages(userId: string, limit = 10, conversationId?: string): Promise<ChatMessage[]> {
    const rows = await this.repository.findRecent(userId, limit, conversationId);

    return rows.map((row) => ({
      role: row.role as ChatMessage['role'],
      content: row.content,
    }));
  }

  deleteAll(userId: string): Promise<any> {
    return this.repository.deleteAll(userId);
  }

  count(userId: string) {
    return this.repository.count(userId);
  }
}
