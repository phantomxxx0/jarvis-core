import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database';
import { EpisodeRepository } from './episode.repository';
import { EpisodicMemoryService } from './episodic-memory.service';

@Module({
  imports: [DatabaseModule],
  providers: [EpisodeRepository, EpisodicMemoryService],
  exports: [EpisodicMemoryService],
})
export class EpisodicModule {}
