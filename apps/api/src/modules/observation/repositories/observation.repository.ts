import { Injectable } from '@nestjs/common';
import { userObservations } from '@jarvis/database';
import { DatabaseService } from '../../../database';
import { eq } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type ObservationInsert = InferInsertModel<typeof userObservations>;
export type ObservationSelect = InferSelectModel<typeof userObservations>;

@Injectable()
export class ObservationRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(data: ObservationInsert): Promise<ObservationSelect> {
    const [result] = await this.database.db
      .insert(userObservations)
      .values(data)
      .returning();
    return result;
  }

  async findById(id: string): Promise<ObservationSelect | undefined> {
    const [result] = await this.database.db
      .select()
      .from(userObservations)
      .where(eq(userObservations.id, id))
      .limit(1);
    return result;
  }
}
