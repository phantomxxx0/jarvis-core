import { Module, Provider } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { WorkersModule } from '../workers/workers.module';
import { InferenceModule } from '../workers/inference/inference.module';

import { VectorModule } from '../vector/vector.module';

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
    WorkersModule,
    InferenceModule,
    VectorModule,
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
