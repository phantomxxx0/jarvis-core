import { Injectable } from '@nestjs/common';
import {
  PreferenceRepository,
  PreferenceSelect,
} from '../repositories/preference.repository';

@Injectable()
export class PreferenceService {
  constructor(private readonly repository: PreferenceRepository) {}

  async getContextForUser(userId: string): Promise<PreferenceSelect[]> {
    return this.repository.findByUserId(userId);
  }
}
