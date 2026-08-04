import { Injectable } from '@nestjs/common';
import {
  ProfileRepository,
  ProfileSelect,
} from '../repositories/profile.repository';

@Injectable()
export class ProfileService {
  constructor(private readonly repository: ProfileRepository) {}

  async getContextForUser(userId: string): Promise<ProfileSelect[]> {
    return this.repository.findByUserId(userId);
  }
}
