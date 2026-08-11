import { Injectable } from '@nestjs/common';
import {
  LocationRepository,
  LocationSelect,
} from '../repositories/location.repository';

@Injectable()
export class LocationService {
  constructor(private readonly repository: LocationRepository) {}

  async getContextForUser(userId: string): Promise<LocationSelect[]> {
    return this.repository.findByUserId(userId);
  }
}
