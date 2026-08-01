import { Module } from '@nestjs/common';

import { AIModule } from '../ai/ai.module';

import { MemoriesController } from './memories.controller';
import { MemoriesService } from './memories.service';
import { MemoriesRepository } from './repositories/memories.repository';

@Module({
  imports: [
    AIModule,
  ],
  controllers: [
    MemoriesController,
  ],
  providers: [
    MemoriesRepository,
    MemoriesService,
  ],
  exports: [
    MemoriesService,
  ],
})
export class MemoriesModule {}
