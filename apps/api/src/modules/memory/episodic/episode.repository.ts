import { Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { memories } from '@jarvis/database';
import { DatabaseService } from '../../../database';

export interface CreateEpisodeData {
  userId: string;
  conversationId?: string;
  title: string;
  summary: string;
  participants?: string[];
  importance?: number;
}

@Injectable()
export class EpisodeRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(data: CreateEpisodeData) {
    const [mem] = await this.database.db
      .insert(memories)
      .values({
        userId: data.userId,
        type: 'EPISODE',
        origin: 'episode.repository',
        content: `${data.title}\n${data.summary}`,
        importance: data.importance ?? 50,
        metadata: {
          conversationId: data.conversationId,
          title: data.title,
          summary: data.summary,
          participants: data.participants,
        },
      })
      .returning();

    return {
      id: mem.id,
      userId: mem.userId,
      conversationId: (mem.metadata as any)?.conversationId,
      title: (mem.metadata as any)?.title ?? '',
      summary: (mem.metadata as any)?.summary ?? mem.content,
      participants: (mem.metadata as any)?.participants ?? [],
      importance: mem.importance,
      timestamp: mem.createdAt,
    };
  }

  async findById(userId: string, id: string) {
    const [mem] = await this.database.db
      .select()
      .from(memories)
      .where(
        and(
          eq(memories.userId, userId),
          eq(memories.id, id),
          eq(memories.type, 'EPISODE'),
        ),
      );

    if (!mem) return undefined;

    return {
      id: mem.id,
      userId: mem.userId,
      conversationId: (mem.metadata as any)?.conversationId,
      title: (mem.metadata as any)?.title ?? '',
      summary: (mem.metadata as any)?.summary ?? mem.content,
      participants: (mem.metadata as any)?.participants ?? [],
      importance: mem.importance,
      timestamp: mem.createdAt,
    };
  }

  async search(userId: string, query: string, limit = 10) {
    const records = await this.database.db
      .select()
      .from(memories)
      .where(
        and(
          eq(memories.userId, userId),
          eq(memories.type, 'EPISODE'),
          ilike(memories.content, `%${query}%`),
        ),
      )
      .orderBy(desc(memories.createdAt))
      .limit(limit);

    return records.map((mem) => ({
      id: mem.id,
      userId: mem.userId,
      conversationId: (mem.metadata as any)?.conversationId,
      title: (mem.metadata as any)?.title ?? '',
      summary: (mem.metadata as any)?.summary ?? mem.content,
      participants: (mem.metadata as any)?.participants ?? [],
      importance: mem.importance,
      timestamp: mem.createdAt,
    }));
  }
}
