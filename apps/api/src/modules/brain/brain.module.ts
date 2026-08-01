import { Module } from '@nestjs/common';

import { BrainService } from './brain.service';

import { PlannerService } from './planner/planner.service';
import { ReasonerService } from './reasoner/reasoner.service';
import { IntentService } from './intent/intent.service';
import { ContextService } from './context/context.service';
import { RouterService } from './router/router.service';
import { RegistryService } from './registry/registry.service';
import { TaskEngineService } from './task-engine/task-engine.service';

@Module({
  providers: [
    BrainService,
    PlannerService,
    ReasonerService,
    IntentService,
    ContextService,
    RouterService,
    RegistryService,
    TaskEngineService,
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
  ],
})
export class BrainModule {}
