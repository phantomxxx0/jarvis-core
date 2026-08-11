import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { userGoals } from '@jarvis/database';
import { DatabaseService } from '../../../database';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type GoalInsert = InferInsertModel<typeof userGoals>;
export type GoalSelect = InferSelectModel<typeof userGoals>;

@Injectable()
export class GoalRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByUserId(userId: string): Promise<GoalSelect[]> {
    return this.database.db
      .select()
      .from(userGoals)
      .where(eq(userGoals.userId, userId));
  }

  async create(data: GoalInsert): Promise<GoalSelect> {
    const [result] = await this.database.db
      .insert(userGoals)
      .values(data)
      .returning();
    return result;
  }
}
