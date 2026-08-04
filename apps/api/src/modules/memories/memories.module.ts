import { Module, forwardRef, Provider } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AIModule } from '../ai/ai.module';
import { WorkersModule } from '../workers/workers.module';
import { InferenceModule } from '../workers/inference/inference.module';

import { MemoriesController } from './memories.controller';
import { MemoriesService } from './memories.service';
import { MemoriesRepository } from './repositories/memories.repository';
import { MemoryIndexService } from './services/memory-index.service';
import { MemoryContextProvider } from './providers/memory.context-provider';
import { MemoryConsolidationService } from './services/memory-consolidation.service';

const contextProvider = {
  provide: 'CONTEXT_PROVIDERS',
  useClass: MemoryContextProvider,
  multi: true,
} as Provider;

@Module({
  imports: [
    forwardRef(() => AIModule),
    WorkersModule,
    InferenceModule,
    ScheduleModule.forRoot(),
  ],

  controllers: [MemoriesController],

  providers: [
    MemoriesRepository,
    MemoriesService,
    MemoryIndexService,
    MemoryConsolidationService,
    contextProvider,
  ],

  exports: [MemoriesService, MemoryIndexService],
})
export class MemoriesModule {}
