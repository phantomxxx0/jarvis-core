import { Injectable, Logger } from '@nestjs/common';
import { and, eq, ilike } from 'drizzle-orm';
import { userDevices } from '@jarvis/database';
import { DatabaseService } from '../../../database';
import {
  IMemoryService,
  MemoryContext,
  MemoryRankParams,
  MemoryRetrievalParams,
  MemoryStoreParams,
  MemoryUpdateParams,
} from '../interfaces/memory-service.interface';

export interface DeviceMemoryData {
  id?: string;
  deviceName: string;
  deviceType: string;
  lastSeenAt?: Date;
}

@Injectable()
export class DeviceMemoryService implements IMemoryService<DeviceMemoryData> {
  private readonly logger = new Logger(DeviceMemoryService.name);

  constructor(private readonly database: DatabaseService) {}

  async store(
    params: MemoryStoreParams<DeviceMemoryData>,
  ): Promise<DeviceMemoryData> {
    await this.database.db.insert(userDevices).values({
      userId: params.userId,
      deviceName: params.data.deviceName,
      deviceType: params.data.deviceType,
      lastSeenAt: params.data.lastSeenAt ?? new Date(),
    });
    return params.data;
  }

  async retrieve(params: MemoryRetrievalParams): Promise<DeviceMemoryData[]> {
    const devices = await this.database.db
      .select()
      .from(userDevices)
      .where(
        and(
          eq(userDevices.userId, params.userId),
          ilike(userDevices.deviceName, `%${params.query}%`),
        ),
      )
      .limit(params.limit ?? 5);

    return devices.map((d) => ({
      id: d.id,
      deviceName: d.deviceName,
      deviceType: d.deviceType,
      lastSeenAt: d.lastSeenAt,
    }));
  }

  async update(
    params: MemoryUpdateParams<DeviceMemoryData>,
  ): Promise<DeviceMemoryData> {
    throw new Error('Method not implemented.');
  }

  async rank(params: MemoryRankParams): Promise<number> {
    return 100;
  }

  async summarize(memoryIds: string[]): Promise<string> {
    return 'Device memory summary stub';
  }

  async composeContext(
    params: MemoryRetrievalParams,
  ): Promise<MemoryContext[]> {
    const data = await this.retrieve(params);
    return data.map((d) => ({
      content: `Device: ${d.deviceName} (${d.deviceType}) - Last seen: ${d.lastSeenAt?.toISOString()}`,
      source: 'DeviceMemory',
      confidence: 100, // canonical source
      memoryId: d.id,
    }));
  }
}
