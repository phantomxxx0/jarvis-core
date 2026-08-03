import { Module } from '@nestjs/common';

import { WorkersModule } from '../workers/workers.module';
import { InferenceModule } from '../workers/inference/inference.module';
import { MemoriesModule } from '../memories/memories.module';
import { ConversationsModule } from '../conversations/conversations.module';

import { BrainService } from './brain.service';
import { PlannerService } from './planner/planner.service';
import { PlannerPromptBuilder } from './planner/planner.prompt-builder';
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
import { ToolRegistryService } from './tools/tool-registry.service';
import { ExecutionRunnerService } from './execution/execution-runner.service'; // <-- Phase 3.8 Self-Correction Runner

@Module({
  imports: [
    WorkersModule,
    InferenceModule,
    MemoriesModule,
    ConversationsModule,
  ],
  providers: [
    BrainService,
    PlannerService,
    PlannerPromptBuilder,
    ReasonerService,

    ExecutionBuilderService,
    ExecutionRepository,
    TaskEngineService,
    TaskRouterService,
    ToolRegistryService,
    ExecutionRunnerService, // <-- Phase 3.8 Provider

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
    ToolRegistryService,
    ExecutionRunnerService, // <-- Phase 3.8 Export
  ],
})
export class BrainModule { }