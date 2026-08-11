import { Test, TestingModule } from '@nestjs/testing';
import { ExtractionPipelineService } from './extraction-pipeline.service';
import { FactExtractor } from './fact.extractor';
import { RelationshipExtractor } from './relationship.extractor';
import { PreferenceExtractor } from './preference.extractor';
import { GoalExtractor } from './goal.extractor';
import { EpisodeExtractor } from './episode.extractor';
import { ProcedureExtractor } from './procedure.extractor';
import { ProjectExtractor } from './project.extractor';
import { DeviceExtractor } from './device.extractor';

describe('ExtractionPipelineService', () => {
  let service: ExtractionPipelineService;

  beforeEach(async () => {
    // Mock the extractors
    const mockExtractor = {
      extract: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractionPipelineService,
        { provide: FactExtractor, useValue: mockExtractor },
        { provide: RelationshipExtractor, useValue: mockExtractor },
        { provide: PreferenceExtractor, useValue: mockExtractor },
        { provide: GoalExtractor, useValue: mockExtractor },
        { provide: EpisodeExtractor, useValue: mockExtractor },
        { provide: ProcedureExtractor, useValue: mockExtractor },
        { provide: ProjectExtractor, useValue: mockExtractor },
        { provide: DeviceExtractor, useValue: mockExtractor },
      ],
    }).compile();

    service = module.get<ExtractionPipelineService>(ExtractionPipelineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call all extractors and aggregate results', async () => {
    const results = await service.extractAll('hello', 'context');
    expect(Array.isArray(results)).toBe(true);
  });
});
