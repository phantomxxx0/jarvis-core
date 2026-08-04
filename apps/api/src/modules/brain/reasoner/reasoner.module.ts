import { Module } from '@nestjs/common';
import { ReasonerService } from './reasoner.service';

@Module({
  imports: [],
  providers: [ReasonerService],
  exports: [ReasonerService],
})
export class ReasonerModule {}
