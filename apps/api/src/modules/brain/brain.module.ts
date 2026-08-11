import { Module } from '@nestjs/common';

import { WorkersModule } from '../workers/workers.module';
import { InferenceModule } from '../workers/inference/inference.module';
import { MemoriesModule } from '../memories/memories.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { ObservationModule } from '../observation/observation.module';
import { RegistryModule } from '../registry/registry.module';
import { RuntimeModule } from '../runtime/runtime.module';
import { MemoryModule } from '../memory/memory.module';
import { ReflectionModule } from './reflection/reflection.module';
import { LearningModule } from './learning/learning.module';
import { GovernanceModule } from '../governance/governance.module';
import { AutonomousExecutionController } from './autonomous/autonomous-controller.service';

import { BrainService } from './brain.service';
import { PlannerService } from './planner/planner.service';
import { PlannerPromptBuilder } from './planner/planner.prompt-builder';
import { ReasonerService } from './reasoner/reasoner.service';
import { IntentService } from './intent/intent.service';
import { ContextService } from './context/context.service';
import { RouterService } from './router/router.service';
import { RegistryService } from './registry/registry.service';
import { TaskRouterService } from './router/task-router.service';
import { BrainEventListener } from './listeners/brain-event.listener';
import { ExecutionRunnerService } from './execution/execution-runner.service';
import { RuntimeContextService } from './context/runtime-context.service';
import { ContextBuilder } from './context/context.builder';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [
    WorkersModule,
    InferenceModule,
    MemoriesModule,
    ConversationsModule,
    ObservationModule,
    RegistryModule,
    RuntimeModule,
    MemoryModule,
    ReflectionModule,
    LearningModule,
    ToolsModule,
    GovernanceModule,
  ],
  providers: [
    BrainService,
    PlannerService,
    PlannerPromptBuilder,
    ReasonerService,

    TaskRouterService,
    ExecutionRunnerService,

    RuntimeContextService,
    ContextBuilder,

    IntentService,
    ContextService,
    RouterService,
    RegistryService,
    BrainEventListener,
    AutonomousExecutionController,
  ],
  exports: [
    BrainService,
    PlannerService,
    ReasonerService,
    IntentService,
    ContextService,
    RouterService,
    RegistryService,
    ExecutionRunnerService,
    AutonomousExecutionController,
  ],
})
export class BrainModule {}
