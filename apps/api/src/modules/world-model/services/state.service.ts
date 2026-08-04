import { Injectable } from '@nestjs/common';
import {
  EnvironmentRepository,
  EnvironmentSelect,
} from '../repositories/environment.repository';

@Injectable()
export class StateService {
  constructor(private readonly repository: EnvironmentRepository) {}

  async getContextForUser(userId: string): Promise<EnvironmentSelect[]> {
    return this.repository.findByUserId(userId);
  }
}
