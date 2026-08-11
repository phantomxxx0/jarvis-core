import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database';
import { MemoryLifecycleService } from './memory-lifecycle.service';

@Module({
  imports: [DatabaseModule],
  providers: [MemoryLifecycleService],
  exports: [MemoryLifecycleService],
})
export class LifecycleModule {}
