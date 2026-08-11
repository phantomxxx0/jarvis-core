import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { ConsciousnessModule } from '../consciousness/consciousness.module';

/**
 * SchedulerModule (Brain V2)
 *
 * Provides background task scheduling for non-blocking cognitive operations.
 */
@Module({
  imports: [ConsciousnessModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
