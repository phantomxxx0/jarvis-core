import { Injectable } from '@nestjs/common';
import { asc, desc, eq } from 'drizzle-orm';

import { conversations } from '@jarvis/database';

import { DatabaseService } from '../../../database';

export interface CreateConversationData {
  userId: string;
  role: string;
  content: string;
}

@Injectable()
export class ConversationsRepository {
  constructor(
    private readonly database: DatabaseService,
  ) {}

  async create(data: CreateConversationData) {
    const [conversation] = await this.database.db
      .insert(conversations)
      .values(data)
      .returning();

    return conversation;
  }

  async findRecent(
    userId: string,
    limit = 10,
  ) {
    const rows = await this.database.db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt))
      .limit(limit);

    return rows.reverse();
  }

  async deleteAll(userId: string) {
    return this.database.db
      .delete(conversations)
      .where(eq(conversations.userId, userId));
  }

  async count(userId: string) {
    const rows = await this.database.db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId));

    return rows.length;
  }
}
