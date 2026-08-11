import { Injectable } from '@nestjs/common';
import { GoalRepository, GoalSelect } from '../repositories/goal.repository';

@Injectable()
export class GoalService {
  constructor(private readonly repository: GoalRepository) {}

  async getContextForUser(userId: string): Promise<GoalSelect[]> {
    return this.repository.findByUserId(userId);
  }
}
