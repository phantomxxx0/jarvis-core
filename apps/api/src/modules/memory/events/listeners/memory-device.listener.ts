import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MemoryEvents } from '../memory-events.enum';
import { DeviceMemoryService } from '../../adapters/device-memory.service';
import { GraphMemoryService } from '../../graph/graph-memory.service';

@Injectable()
export class MemoryDeviceListener {
  private readonly logger = new Logger(MemoryDeviceListener.name);

  constructor(
    private readonly deviceMemory: DeviceMemoryService,
    private readonly graphMemory: GraphMemoryService,
  ) {}

  @OnEvent(MemoryEvents.MEMORY_DEVICE_EXTRACTED)
  async handleDeviceExtracted(payload: any) {
    this.logger.log(
      `Received memory device extracted event for user ${payload.userId}`,
    );

    if (!payload.userId || !payload.device || !payload.device.deviceName) {
      this.logger.warn('Invalid payload: Missing userId or deviceName');
      return;
    }

    try {
      await this.deviceMemory.store({
        userId: payload.userId,
        conversationId: payload.conversationId || 'autonomous',
        data: {
          deviceName: payload.device.deviceName,
          deviceType: payload.device.deviceType,
          lastSeenAt: payload.device.lastSeenAt,
        },
      });

      // Update graph memory to link user to device
      await this.graphMemory.store({
        userId: payload.userId,
        conversationId: payload.conversationId || 'autonomous',
        data: {
          entities: [
            { name: 'User', type: 'Person' },
            { name: payload.device.deviceName, type: 'Device' },
          ],
          relationships: [
            {
              from: 'User',
              relation: 'OWNS_DEVICE',
              to: payload.device.deviceName,
              confidence: payload.confidence || 90,
            },
          ],
        },
      });

      this.logger.log(
        `Successfully stored device memory for user ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to store device memory: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
