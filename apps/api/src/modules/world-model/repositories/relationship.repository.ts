import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { worldRelationships } from '@jarvis/database';
import { DatabaseService } from '../../../database';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type RelationshipInsert = InferInsertModel<typeof worldRelationships>;
export type RelationshipSelect = InferSelectModel<typeof worldRelationships>;

@Injectable()
export class RelationshipRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByUserId(userId: string): Promise<RelationshipSelect[]> {
    return this.database.db
      .select()
      .from(worldRelationships)
      .where(eq(worldRelationships.userId, userId));
  }

  async create(data: RelationshipInsert): Promise<RelationshipSelect> {
    const [result] = await this.database.db
      .insert(worldRelationships)
      .values(data)
      .returning();
    return result;
  }
}
