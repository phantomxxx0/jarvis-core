import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { memories } from '@jarvis/database';

import { DatabaseService } from '../../../database';

export interface CreateMemoryData {
  userId: string;
  type: string;
  origin: string;
  content: string;
  metadata?: unknown;
  importance?: number;
  expiresAt?: Date;
}

export interface UpdateMemoryData {
  type?: string;
  content?: string;
  metadata?: unknown;
  importance?: number;
  expiresAt?: Date | null;
  version?: number;
}

@Injectable()
export class MemoriesRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(data: CreateMemoryData) {
    const [memory] = await this.database.db
      .insert(memories)
      .values(data)
      .returning();

    return memory;
  }

  async findById(id: string) {
    const [memory] = await this.database.db
      .select()
      .from(memories)
      .where(eq(memories.id, id));

    return memory;
  }

  async findByUserId(userId: string) {
    return this.database.db
      .select()
      .from(memories)
      .where(and(eq(memories.userId, userId), eq(memories.status, 'ACTIVE')))
      .orderBy(desc(memories.createdAt));
  }

  async update(id: string, data: UpdateMemoryData) {
    const [memory] = await this.database.db
      .update(memories)
      .set(data)
      .where(eq(memories.id, id))
      .returning();

    return memory;
  }

  async archive(id: string) {
    const [memory] = await this.database.db
      .update(memories)
      .set({
        status: 'ARCHIVED',
        updatedAt: new Date(),
      })
      .where(eq(memories.id, id))
      .returning();

    return memory;
  }

  async updateLastAccessed(id: string) {
    const [memory] = await this.database.db
      .update(memories)
      .set({
        lastAccessedAt: new Date(),
      })
      .where(eq(memories.id, id))
      .returning();

    return memory;
  }
}
