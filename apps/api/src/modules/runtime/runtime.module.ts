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

@Module({
  imports: [ScheduleModule.forRoot(), RegistryModule, ObservationModule],
  controllers: [RuntimeController],
  providers: [
    RuntimeRegistryService,
    MetricsCollectorService,
    HealthMonitorService,
    RuntimeSnapshotService,
    RuntimeObservationListener,
  ],
  exports: [
    RuntimeRegistryService,
    MetricsCollectorService,
    RuntimeSnapshotService,
  ],
})
export class RuntimeModule {}
