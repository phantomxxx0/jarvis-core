import { Injectable, Logger } from '@nestjs/common';
import { HabitRepository } from '../repositories/habit.repository';
import { GoalRepository } from '../repositories/goal.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { PreferenceRepository } from '../repositories/preference.repository';
import { ProfileRepository } from '../repositories/profile.repository';
import { DeviceRepository } from '../repositories/device.repository';

@Injectable()
export class LearningEngineService {
  private readonly logger = new Logger(LearningEngineService.name);

  constructor(
    private readonly habitRepository: HabitRepository,
    private readonly goalRepository: GoalRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly preferenceRepository: PreferenceRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly deviceRepository: DeviceRepository,
  ) {}

  evaluateAndLearn(userId: string): Promise<void> {
    // In the future, this will consume un-processed observations
    // and mutate the domains.
    this.logger.log(`Evaluating observations for user: ${userId}`);
    return Promise.resolve();
  }
}
