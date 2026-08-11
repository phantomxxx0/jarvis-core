import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database';
import { GraphRepository } from './graph.repository';
import { GraphMemoryService } from './graph-memory.service';

@Module({
  imports: [DatabaseModule],
  providers: [GraphRepository, GraphMemoryService],
  exports: [GraphMemoryService],
})
export class GraphModule {}
