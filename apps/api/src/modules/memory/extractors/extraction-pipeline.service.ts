import { Injectable, Logger } from '@nestjs/common';
import { MemoryExtractor, ExtractedMemory } from './memory-extractor.interface';
import { FactExtractor } from './fact.extractor';
import { RelationshipExtractor } from './relationship.extractor';
import { PreferenceExtractor } from './preference.extractor';
import { GoalExtractor } from './goal.extractor';
import { EpisodeExtractor } from './episode.extractor';
import { ProcedureExtractor } from './procedure.extractor';
import { ProjectExtractor } from './project.extractor';
import { DeviceExtractor } from './device.extractor';

@Injectable()
export class ExtractionPipelineService {
  private readonly logger = new Logger(ExtractionPipelineService.name);
  private extractors: MemoryExtractor[];

  constructor(
    factExtractor: FactExtractor,
    relationshipExtractor: RelationshipExtractor,
    preferenceExtractor: PreferenceExtractor,
    goalExtractor: GoalExtractor,
    episodeExtractor: EpisodeExtractor,
    procedureExtractor: ProcedureExtractor,
    projectExtractor: ProjectExtractor,
    deviceExtractor: DeviceExtractor,
  ) {
    this.extractors = [
      factExtractor,
      relationshipExtractor,
      preferenceExtractor,
      goalExtractor,
      episodeExtractor,
      procedureExtractor,
      projectExtractor,
      deviceExtractor,
    ];
  }

  async extractAll(
    conversation: string,
    context: string,
  ): Promise<ExtractedMemory[]> {
    this.logger.log('Starting parallel extraction pipeline...');

    const results = await Promise.allSettled(
      this.extractors.map((extractor) =>
        extractor.extract(conversation, context),
      ),
    );

    const extracted: ExtractedMemory[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        extracted.push(...result.value);
      } else {
        this.logger.warn(`An extractor failed: ${result.reason}`);
      }
    }

    return extracted;
  }
}
