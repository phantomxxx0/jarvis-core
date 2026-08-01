import { Module } from '@nestjs/common';

import { MemoriesController } from './memories.controller';
import { MemoriesService } from './memories.service';
import { MemoriesRepository } from './repositories/memories.repository';

@Module({
  controllers: [MemoriesController],
  providers: [MemoriesRepository, MemoriesService],
  exports: [MemoriesService],
})
export class MemoriesModule {}
