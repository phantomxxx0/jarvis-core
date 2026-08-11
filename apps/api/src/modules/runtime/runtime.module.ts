import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RegistryModule } from '../registry/registry.module';
import { ObservationModule } from '../observation/observation.module';
import { RuntimeRegistryService } from './services/runtime-registry.service';
import { MetricsCollectorService } from './services/metrics-collector.service';
import { HealthMonitorService } from './services/health-monitor.service';
import { RuntimeSnapshotService } from './services/runtime-snapshot.service';
import { RuntimeController } from './controllers/runtime.controller';
import { RuntimeObservationListener } from './listeners/runtime-observation.listener';

import { CapabilityRegistryService } from './services/capability-registry.service';
import { CapabilityRegistryListener } from './listeners/capability-registry.listener';
import { TaskPlannerService } from './services/task-planner.service';
import { ExecutionOrchestratorService } from './services/execution-orchestrator.service';
import { TaskDispatcherService } from './services/task-dispatcher.service';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { WorkflowValidatorService } from './services/workflow-validator.service';
import { WorkflowPlannerService } from './services/workflow-planner.service';
import { DatabaseModule } from '../../database/database.module';
import { InferenceModule } from '../workers/inference/inference.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RegistryModule,
    ObservationModule,
    DatabaseModule,
    InferenceModule,
  ],
  controllers: [RuntimeController],
  providers: [
    RuntimeRegistryService,
    MetricsCollectorService,
    HealthMonitorService,
    RuntimeSnapshotService,
    RuntimeObservationListener,
    CapabilityRegistryService,
    CapabilityRegistryListener,
    TaskPlannerService,
    ExecutionOrchestratorService,
    TaskDispatcherService,
    WorkflowEngineService,
    WorkflowValidatorService,
    WorkflowPlannerService,
  ],
  exports: [
    RuntimeRegistryService,
    MetricsCollectorService,
    RuntimeSnapshotService,
    CapabilityRegistryService,
    TaskPlannerService,
    ExecutionOrchestratorService,
    TaskDispatcherService,
    WorkflowEngineService,
    WorkflowValidatorService,
    WorkflowPlannerService,
  ],
})
export class RuntimeModule {}
