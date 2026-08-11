import { Module } from '@nestjs/common';
import { MemoryOrchestratorService } from './memory-orchestrator.service';
import { ExtractorModule } from '../extractors/extractor.module';
import { ValidationModule } from '../validation/validation.module';
import { ConversationsModule } from '../../conversations/conversations.module';

@Module({
  imports: [ExtractorModule, ValidationModule, ConversationsModule],
  providers: [MemoryOrchestratorService],
  exports: [MemoryOrchestratorService],
})
export class OrchestratorModule {}
