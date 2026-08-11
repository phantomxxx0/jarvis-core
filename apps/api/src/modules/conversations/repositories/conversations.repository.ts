import { Injectable } from '@nestjs/common';
import { desc, eq, and } from 'drizzle-orm';

import { conversations, conversationMessages } from '@jarvis/database';

import { DatabaseService } from '../../../database';

export interface CreateConversationData {
  userId: string;
  role: string;
  content: string;
}

@Injectable()
export class ConversationsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(data: CreateConversationData) {
    // Legacy support, but we should use the new table. Wait, if this creates a single message, we must have a conversationId.
    // For legacy single messages, we just create a conversation first.
    return this.database.db.transaction(async (tx) => {
      const [conv] = await tx
        .insert(conversations)
        .values({ userId: data.userId })
        .returning();
      const [msg] = await tx
        .insert(conversationMessages)
        .values({
          conversationId: conv.id,
          userId: data.userId,
          role: data.role,
          content: data.content,
        })
        .returning();
      return msg;
    });
  }

  async saveInteractionTurn(
    userId: string,
    userMessage: string,
    assistantMessage: string,
    conversationId?: string,
  ) {
    return this.database.db.transaction(async (tx) => {
      let convId = conversationId;
      let conv: any;

      if (convId) {
        const existing = await tx
          .select()
          .from(conversations)
          .where(eq(conversations.id, convId))
          .limit(1);

        if (existing.length > 0) {
          conv = existing[0];
          if (conv.userId !== userId) {
            throw new Error('Unauthorized conversation access');
          }
        }
      }

      if (!conv) {
        const insertValues: any = { userId };
        if (convId) {
          insertValues.id = convId;
        }
        const [newConv] = await tx
          .insert(conversations)
          .values(insertValues)
          .returning();
        conv = newConv;
      }

      const [userSaved] = await tx
        .insert(conversationMessages)
        .values({
          conversationId: conv.id,
          userId,
          role: 'user',
          content: userMessage,
        })
        .returning();

      const [assistantSaved] = await tx
        .insert(conversationMessages)
        .values({
          conversationId: conv.id,
          userId,
          role: 'assistant',
          content: assistantMessage,
        })
        .returning();

      return { conv, userSaved, assistantSaved };
    });
  }

  async findRecent(userId: string, limit = 10, conversationId?: string) {
    const condition = conversationId
      ? and(eq(conversationMessages.userId, userId), eq(conversationMessages.conversationId, conversationId))
      : eq(conversationMessages.userId, userId);

    const rows = await this.database.db
      .select()
      .from(conversationMessages)
      .where(condition)
      .orderBy(desc(conversationMessages.createdAt))
      .limit(limit);

    return rows.reverse();
  }


  async deleteAll(userId: string): Promise<any> {
    return this.database.db
      .delete(conversations)
      .where(eq(conversations.userId, userId));
  }

  async count(userId: string) {
    const rows = await this.database.db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.userId, userId));

    return rows.length;
  }
}
