import { Module } from '@nestjs/common';

import { WorkersModule } from '../workers/workers.module';
import { MemoriesModule } from '../memories/memories.module';
import { ConversationsModule } from '../conversations/conversations.module';

import { BrainService } from './brain.service';
import { PlannerService } from './planner/planner.service';
import { ReasonerService } from './reasoner/reasoner.service';
import { IntentService } from './intent/intent.service';
import { ContextService } from './context/context.service';
import { RouterService } from './router/router.service';
import { RegistryService } from './registry/registry.service';
import { TaskEngineService } from './task-engine/task-engine.service';
import { ExecutionBuilderService } from './task-engine/execution-builder.service';
import { ExecutionRepository } from './task-engine/repository/execution.repository';
import { TaskRouterService } from './router/task-router.service';
import { BrainEventListener } from './listeners/brain-event.listener';

@Module({
  imports: [WorkersModule, MemoriesModule, ConversationsModule],
  providers: [
    BrainService,
    PlannerService,
    ReasonerService,

    ExecutionBuilderService,
    ExecutionRepository,
    TaskEngineService,
    TaskRouterService,

    IntentService,
    ContextService,
    RouterService,
    RegistryService,
    BrainEventListener,
  ],
  exports: [
    BrainService,
    PlannerService,
    ReasonerService,
    IntentService,
    ContextService,
    RouterService,
    RegistryService,
    TaskEngineService,
    ExecutionBuilderService,
  ],
})
export class BrainModule {}
