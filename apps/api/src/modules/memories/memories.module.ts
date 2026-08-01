import { Module, forwardRef } from '@nestjs/common';

import { AIModule } from '../ai/ai.module';

import { MemoriesController } from './memories.controller';
import { MemoriesService } from './memories.service';
import { MemoriesRepository } from './repositories/memories.repository';
import { MemoryIndexService } from './services/memory-index.service';

@Module({
  imports: [
    forwardRef(() => AIModule),
  ],

  controllers: [
    MemoriesController,
  ],

  providers: [
    MemoriesRepository,
    MemoriesService,
    MemoryIndexService,
  ],

  exports: [
    MemoriesService,
    MemoryIndexService,
  ],
})
export class MemoriesModule {}
