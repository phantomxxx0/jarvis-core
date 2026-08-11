import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database';
import { MemoryRankingService } from './memory-ranking.service';

@Module({
  imports: [DatabaseModule],
  providers: [MemoryRankingService],
  exports: [MemoryRankingService],
})
export class RankingModule {}
