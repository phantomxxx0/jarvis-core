import { Module } from '@nestjs/common';
import { ReflectionService } from './reflection.service';
import { WorkersModule } from '../../workers/workers.module';

@Module({
  imports: [WorkersModule],
  providers: [ReflectionService],
  exports: [ReflectionService],
})
export class ReflectionModule {}
