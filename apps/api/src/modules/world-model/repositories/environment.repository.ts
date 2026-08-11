import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { worldEnvironmentStates } from '@jarvis/database';
import { DatabaseService } from '../../../database';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type EnvironmentInsert = InferInsertModel<typeof worldEnvironmentStates>;
export type EnvironmentSelect = InferSelectModel<typeof worldEnvironmentStates>;

@Injectable()
export class EnvironmentRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByUserId(userId: string): Promise<EnvironmentSelect[]> {
    return this.database.db
      .select()
      .from(worldEnvironmentStates)
      .where(eq(worldEnvironmentStates.userId, userId));
  }

  async create(data: EnvironmentInsert): Promise<EnvironmentSelect> {
    const [result] = await this.database.db
      .insert(worldEnvironmentStates)
      .values(data)
      .returning();
    return result;
  }
}
