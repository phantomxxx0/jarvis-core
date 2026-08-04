import { Module } from '@nestjs/common';
import { WorkerRegistryService } from './worker-registry.service';
import { RegistryModule } from '../../registry/registry.module';

/**
 * Leaf module that owns WorkerRegistryService.
 * This is provided at the platform level so distinct worker boundaries (Inference, Webhooks, etc.)
 * can inject `WorkerRegistryService` independently.
 *
 * It does not have any deep dependencies on BrainModule, Planner, etc.
 */
@Module({
  imports: [RegistryModule],
  providers: [WorkerRegistryService],
  exports: [WorkerRegistryService],
})
export class WorkerRegistryModule {}
