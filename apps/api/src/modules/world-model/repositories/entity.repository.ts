import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { worldEntities } from '@jarvis/database';
import { DatabaseService } from '../../../database';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type EntityInsert = InferInsertModel<typeof worldEntities>;
export type EntitySelect = InferSelectModel<typeof worldEntities>;

@Injectable()
export class EntityRepository {
  constructor(private readonly database: DatabaseService) {}

  async findById(id: string): Promise<EntitySelect[]> {
    return this.database.db
      .select()
      .from(worldEntities)
      .where(eq(worldEntities.id, id));
  }

  async create(data: EntityInsert): Promise<EntitySelect> {
    const [result] = await this.database.db
      .insert(worldEntities)
      .values(data)
      .returning();
    return result;
  }
}
