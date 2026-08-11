import { Module } from '@nestjs/common';
import { LearningGateway } from './learning.service';
import { MemoryGatewayModule } from '../memory/memory.module';

/**
 * LearningModule (Brain V2)
 *
 * Background-only learning module. Routes consolidation through the
 * ConsolidationQueue. V2-native — no V1 dependency.
 */
@Module({
  imports: [MemoryGatewayModule],
  providers: [LearningGateway],
  exports: [LearningGateway],
})
export class LearningModuleV2 {}
