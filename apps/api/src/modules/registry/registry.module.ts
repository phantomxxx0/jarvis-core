import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CapabilityRegistryService } from './capability-registry.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [CapabilityRegistryService],
  exports: [CapabilityRegistryService],
})
export class RegistryModule {}
