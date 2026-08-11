import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database';
import { ProcedureRepository } from './procedure.repository';
import { ProceduralMemoryService } from './procedural-memory.service';

@Module({
  imports: [DatabaseModule],
  providers: [ProcedureRepository, ProceduralMemoryService],
  exports: [ProceduralMemoryService],
})
export class ProceduralModule {}
