import { Module } from '@nestjs/common';
import { WorkersModule } from '../../workers/workers.module';
import { ExtractionPipelineService } from './extraction-pipeline.service';
import { FactExtractor } from './fact.extractor';
import { RelationshipExtractor } from './relationship.extractor';
import { PreferenceExtractor } from './preference.extractor';
import { GoalExtractor } from './goal.extractor';
import { EpisodeExtractor } from './episode.extractor';
import { ProcedureExtractor } from './procedure.extractor';
import { ProjectExtractor } from './project.extractor';
import { DeviceExtractor } from './device.extractor';

@Module({
  imports: [WorkersModule],
  providers: [
    ExtractionPipelineService,
    FactExtractor,
    RelationshipExtractor,
    PreferenceExtractor,
    GoalExtractor,
    EpisodeExtractor,
    ProcedureExtractor,
    ProjectExtractor,
    DeviceExtractor,
  ],
  exports: [ExtractionPipelineService],
})
export class ExtractorModule {}
