import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database';
import { ProjectMemoryService } from './project-memory.service';
import { DeviceMemoryService } from './device-memory.service';
import { PreferenceMemoryService } from './preference-memory.service';
import { GoalMemoryService } from './goal-memory.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    ProjectMemoryService,
    DeviceMemoryService,
    PreferenceMemoryService,
    GoalMemoryService,
  ],
  exports: [
    ProjectMemoryService,
    DeviceMemoryService,
    PreferenceMemoryService,
    GoalMemoryService,
  ],
})
export class AdaptersModule {}
