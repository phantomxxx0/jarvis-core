import { Module } from '@nestjs/common';
import { ReasonerService } from './reasoner.service';
import { WorkersModule } from '../../workers/workers.module';
import { ToolsModule } from '../../tools/tools.module';

@Module({
  imports: [WorkersModule, ToolsModule],
  providers: [ReasonerService],
  exports: [ReasonerService],
})
export class ReasonerModule {}
