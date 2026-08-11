import { Module } from '@nestjs/common';

import { ProfileRepository } from './repositories/profile.repository';
import { PreferenceRepository } from './repositories/preference.repository';
import { HabitRepository } from './repositories/habit.repository';
import { GoalRepository } from './repositories/goal.repository';
import { ProjectRepository } from './repositories/project.repository';
import { DeviceRepository } from './repositories/device.repository';

import { ProfileService } from './services/profile.service';
import { PreferenceService } from './services/preference.service';
import { HabitService } from './services/habit.service';
import { GoalService } from './services/goal.service';
import { ProjectService } from './services/project.service';
import { DeviceService } from './services/device.service';
import { LearningEngineService } from './services/learning-engine.service';

import { PersonalContextProvider } from './providers/personal.context-provider';
import { CONTEXT_PROVIDERS } from '../brain/context/contracts/context-provider.interface';
import { DatabaseModule } from '../../database';

const repositories = [
  ProfileRepository,
  PreferenceRepository,
  HabitRepository,
  GoalRepository,
  ProjectRepository,
  DeviceRepository,
];

const services = [
  ProfileService,
  PreferenceService,
  HabitService,
  GoalService,
  ProjectService,
  DeviceService,
  LearningEngineService,
];

@Module({
  imports: [DatabaseModule],
  providers: [
    ...repositories,
    ...services,
    PersonalContextProvider,
    {
      provide: CONTEXT_PROVIDERS,
      useExisting: PersonalContextProvider,
    },
  ],
  exports: [PersonalContextProvider, ...services],
})
export class PersonalIntelligenceModule {}
