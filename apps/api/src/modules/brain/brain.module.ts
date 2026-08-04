import { Module } from '@nestjs/common';

import { WorkersModule } from '../workers/workers.module';
import { InferenceModule } from '../workers/inference/inference.module';
import { MemoriesModule } from '../memories/memories.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { ObservationModule } from '../observation/observation.module';
import { RegistryModule } from '../registry/registry.module';
import { RuntimeModule } from '../runtime/runtime.module';

import { BrainService } from './brain.service';
import { PlannerService } from './planner/planner.service';
import { PlannerPromptBuilder } from './planner/planner.prompt-builder';
import { ReasonerService } from './reasoner/reasoner.service';
import { IntentService } from './intent/intent.service';
import { ContextService } from './context/context.service';
import { RouterService } from './router/router.service';
import { RegistryService } from './registry/registry.service';
import { ExecutionSchedulerService } from './execution/execution-scheduler.service';
import { ExecutionBuilderService } from './task-engine/execution-builder.service';
import { ExecutionRepository } from './task-engine/repository/execution.repository';
import { TaskRouterService } from './router/task-router.service';
import { BrainEventListener } from './listeners/brain-event.listener';
import { ToolRegistryService } from './tools/tool-registry.service';
import { ReadFileTool } from './tools/implementations/read-file.tool';
import { ExecuteSqlTool } from './tools/implementations/execute-sql.tool';
import { ExecutionRunnerService } from './execution/execution-runner.service';
import { RuntimeContextService } from './context/runtime-context.service';
import { ContextBuilder } from './context/context.builder';

@Module({
  imports: [
    WorkersModule,
    InferenceModule,
    MemoriesModule,
    ConversationsModule,
    ObservationModule,
    RegistryModule,
    RuntimeModule,
  ],
  providers: [
    BrainService,
    PlannerService,
    PlannerPromptBuilder,
    ReasonerService,

    ExecutionBuilderService,
    ExecutionRepository,
    ExecutionSchedulerService,
    TaskRouterService,
    ToolRegistryService,
    ReadFileTool,
    ExecuteSqlTool,
    ExecutionRunnerService, // <-- Phase 3.8 Provider

    RuntimeContextService,
    ContextBuilder,

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
    ExecutionSchedulerService,
    ExecutionBuilderService,
    ToolRegistryService,
    ExecutionRunnerService, // <-- Phase 3.8 Export
  ],
})
export class BrainModule {}
