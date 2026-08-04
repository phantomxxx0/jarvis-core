import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { userProfiles } from '@jarvis/database';
import { DatabaseService } from '../../../database';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type ProfileInsert = InferInsertModel<typeof userProfiles>;
export type ProfileSelect = InferSelectModel<typeof userProfiles>;

@Injectable()
export class ProfileRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByUserId(userId: string): Promise<ProfileSelect[]> {
    return this.database.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
  }

  async create(data: ProfileInsert): Promise<ProfileSelect> {
    const [result] = await this.database.db
      .insert(userProfiles)
      .values(data)
      .returning();
    return result;
  }
}
