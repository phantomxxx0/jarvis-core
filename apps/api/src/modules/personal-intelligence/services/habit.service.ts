import { Injectable } from '@nestjs/common';
import { HabitRepository, HabitSelect } from '../repositories/habit.repository';

@Injectable()
export class HabitService {
  constructor(private readonly repository: HabitRepository) {}

  async getContextForUser(userId: string): Promise<HabitSelect[]> {
    return this.repository.findByUserId(userId);
  }
}
