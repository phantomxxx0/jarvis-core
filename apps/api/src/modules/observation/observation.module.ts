import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { ObservationRepository } from './repositories/observation.repository';
import { ObservationManagerService } from './services/observation-manager.service';

import { WorldSynchronizer } from './synchronizers/world.synchronizer';
import { LearningSynchronizer } from './synchronizers/learning.synchronizer';
import { MemorySynchronizer } from './synchronizers/memory.synchronizer';
import { KnowledgeSynchronizer } from './synchronizers/knowledge.synchronizer';
import { ObservationDlqRepository } from './repositories/observation-dlq.repository';
import { IdempotencyService } from './services/idempotency.service';
import { ObservationQueueService } from './services/observation-queue.service';
import { ObservationController } from './controllers/observation.controller';

@Module({
  imports: [DatabaseModule, EventEmitterModule.forRoot()],
  controllers: [ObservationController],
  providers: [
    ObservationRepository,
    ObservationDlqRepository,
    IdempotencyService,
    ObservationQueueService,
    ObservationManagerService,
    WorldSynchronizer,
    LearningSynchronizer,
    MemorySynchronizer,
    KnowledgeSynchronizer,
  ],
  exports: [ObservationManagerService],
})
export class ObservationModule {}
