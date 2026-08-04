import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { worldLocations } from '@jarvis/database';
import { DatabaseService } from '../../../database';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type LocationInsert = InferInsertModel<typeof worldLocations>;
export type LocationSelect = InferSelectModel<typeof worldLocations>;

@Injectable()
export class LocationRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByUserId(userId: string): Promise<LocationSelect[]> {
    return this.database.db
      .select()
      .from(worldLocations)
      .where(eq(worldLocations.userId, userId));
  }

  async create(data: LocationInsert): Promise<LocationSelect> {
    const [result] = await this.database.db
      .insert(worldLocations)
      .values(data)
      .returning();
    return result;
  }
}
