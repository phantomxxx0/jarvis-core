import { Injectable } from '@nestjs/common';
import {
  DeviceRepository,
  DeviceSelect,
} from '../repositories/device.repository';

@Injectable()
export class DeviceService {
  constructor(private readonly repository: DeviceRepository) {}

  async getContextForUser(userId: string): Promise<DeviceSelect[]> {
    return this.repository.findByUserId(userId);
  }
}
