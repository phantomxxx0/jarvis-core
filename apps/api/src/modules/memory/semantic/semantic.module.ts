import { Module } from '@nestjs/common';
import { MemoriesModule } from '../../memories/memories.module';
import { SemanticMemoryService } from './semantic-memory.service';

@Module({
  imports: [MemoriesModule],
  providers: [SemanticMemoryService],
  exports: [SemanticMemoryService],
})
export class SemanticModule {}
