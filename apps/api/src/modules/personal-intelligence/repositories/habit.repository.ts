import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { userHabits } from '@jarvis/database';
import { DatabaseService } from '../../../database';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type HabitInsert = InferInsertModel<typeof userHabits>;
export type HabitSelect = InferSelectModel<typeof userHabits>;

@Injectable()
export class HabitRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByUserId(userId: string): Promise<HabitSelect[]> {
    return this.database.db
      .select()
      .from(userHabits)
      .where(eq(userHabits.userId, userId));
  }

  async create(data: HabitInsert): Promise<HabitSelect> {
    const [result] = await this.database.db
      .insert(userHabits)
      .values(data)
      .returning();
    return result;
  }
}
