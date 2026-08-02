import { Injectable } from '@nestjs/common';

import { ChatMessage } from '../ai/interfaces/chat-message.interface';

import {
  ConversationsRepository,
  CreateConversationData,
} from './repositories/conversations.repository';

@Injectable()
export class ConversationsService {
  constructor(private readonly repository: ConversationsRepository) {}

  create(data: CreateConversationData) {
    return this.repository.create(data);
  }

  async saveMessage(userId: string, message: ChatMessage) {
    return this.repository.create({
      userId,
      role: message.role,
      content: message.content,
    });
  }

  async getRecentMessages(userId: string, limit = 10): Promise<ChatMessage[]> {
    const rows = await this.repository.findRecent(userId, limit);

    return rows.map((row) => ({
      role: row.role as ChatMessage['role'],
      content: row.content,
    }));
  }

  deleteAll(userId: string) {
    return this.repository.deleteAll(userId);
  }

  count(userId: string) {
    return this.repository.count(userId);
  }
}
