import { Injectable } from '@nestjs/common';
import { and, desc, eq, ilike } from 'drizzle-orm';
import { memories } from '@jarvis/database';
import { DatabaseService } from '../../../database';

export interface CreateProcedureData {
  userId: string;
  title: string;
  description?: string;
  steps: Array<{
    instruction: string;
    command?: string;
  }>;
}

import { BrainEvent } from '../../brain/events/enums/brain-event.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ProcedureRepository {
  constructor(
    private readonly database: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(data: CreateProcedureData) {
    const [mem] = await this.database.db
      .insert(memories)
      .values({
        userId: data.userId,
        type: 'PROCEDURE',
        origin: 'procedure.repository',
        content: `${data.title}\n${data.description || ''}`,
        metadata: {
          title: data.title,
          description: data.description,
          steps: data.steps,
        },
      })
      .returning();

    this.eventEmitter.emit(BrainEvent.MEMORY_STORED, { memory: mem });

    return {
      id: mem.id,
      userId: mem.userId,
      title: (mem.metadata as any)?.title ?? '',
      description: (mem.metadata as any)?.description,
      createdAt: mem.createdAt,
    };
  }

  async search(userId: string, query: string, limit = 10) {
    const records = await this.database.db
      .select()
      .from(memories)
      .where(
        and(
          eq(memories.userId, userId),
          eq(memories.type, 'PROCEDURE'),
          ilike(memories.content, `%${query}%`),
        ),
      )
      .orderBy(desc(memories.createdAt))
      .limit(limit);

    return records.map((mem) => ({
      id: mem.id,
      userId: mem.userId,
      title: (mem.metadata as any)?.title ?? '',
      description: (mem.metadata as any)?.description,
      createdAt: mem.createdAt,
    }));
  }

  async getSteps(procedureId: string) {
    const [mem] = await this.database.db
      .select()
      .from(memories)
      .where(eq(memories.id, procedureId));

    if (!mem || !mem.metadata || !(mem.metadata as any).steps) {
      return [];
    }

    return (mem.metadata as any).steps as Array<{
      instruction: string;
      command?: string;
    }>;
  }
}
