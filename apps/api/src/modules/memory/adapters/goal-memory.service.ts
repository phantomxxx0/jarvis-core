import { Injectable, Logger } from '@nestjs/common';
import { and, eq, ilike } from 'drizzle-orm';
import { userGoals } from '@jarvis/database';
import { DatabaseService } from '../../../database';
import {
  IMemoryService,
  MemoryContext,
  MemoryRankParams,
  MemoryRetrievalParams,
  MemoryStoreParams,
  MemoryUpdateParams,
} from '../interfaces/memory-service.interface';

export interface GoalMemoryData {
  id?: string;
  title: string;
  description?: string;
  status: string;
  deadlineAt?: Date;
}

@Injectable()
export class GoalMemoryService implements IMemoryService<GoalMemoryData> {
  private readonly logger = new Logger(GoalMemoryService.name);

  constructor(private readonly database: DatabaseService) {}

  async store(
    params: MemoryStoreParams<GoalMemoryData>,
  ): Promise<GoalMemoryData> {
    await this.database.db.insert(userGoals).values({
      userId: params.userId,
      title: params.data.title,
      description: params.data.description,
      status: params.data.status ?? 'ACTIVE',
      deadlineAt: params.data.deadlineAt,
    });
    return params.data;
  }

  async retrieve(params: MemoryRetrievalParams): Promise<GoalMemoryData[]> {
    const goals = await this.database.db
      .select()
      .from(userGoals)
      .where(
        and(
          eq(userGoals.userId, params.userId),
          eq(userGoals.status, 'ACTIVE'),
        ),
      )
      .limit(params.limit ?? 5);

    return goals.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description ?? undefined,
      status: g.status,
      deadlineAt: g.deadlineAt ?? undefined,
    }));
  }

  async update(
    params: MemoryUpdateParams<GoalMemoryData>,
  ): Promise<GoalMemoryData> {
    throw new Error('Method not implemented.');
  }

  async rank(params: MemoryRankParams): Promise<number> {
    return 100;
  }

  async summarize(memoryIds: string[]): Promise<string> {
    return 'Goal memory summary stub';
  }

  async composeContext(
    params: MemoryRetrievalParams,
  ): Promise<MemoryContext[]> {
    const data = await this.retrieve(params);
    return data.map((g) => ({
      content: `Goal: ${g.title} (${g.status}) - ${g.description}`,
      source: 'GoalMemory',
      confidence: 100, // canonical source
      memoryId: g.id,
    }));
  }
}
