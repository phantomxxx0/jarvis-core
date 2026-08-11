import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { userPreferences } from '@jarvis/database';
import { DatabaseService } from '../../../database';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type PreferenceInsert = InferInsertModel<typeof userPreferences>;
export type PreferenceSelect = InferSelectModel<typeof userPreferences>;

@Injectable()
export class PreferenceRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByUserId(userId: string): Promise<PreferenceSelect[]> {
    return this.database.db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
  }

  async create(data: PreferenceInsert): Promise<PreferenceSelect> {
    const [result] = await this.database.db
      .insert(userPreferences)
      .values(data)
      .returning();
    return result;
  }
}
