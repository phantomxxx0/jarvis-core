import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { userDevices } from '@jarvis/database';
import { DatabaseService } from '../../../database';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type DeviceInsert = InferInsertModel<typeof userDevices>;
export type DeviceSelect = InferSelectModel<typeof userDevices>;

@Injectable()
export class DeviceRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByUserId(userId: string): Promise<DeviceSelect[]> {
    return this.database.db
      .select()
      .from(userDevices)
      .where(eq(userDevices.userId, userId));
  }

  async create(data: DeviceInsert): Promise<DeviceSelect> {
    const [result] = await this.database.db
      .insert(userDevices)
      .values(data)
      .returning();
    return result;
  }
}
