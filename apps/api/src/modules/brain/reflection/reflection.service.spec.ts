import { Test, TestingModule } from '@nestjs/testing';
import { ReflectionService } from './reflection.service';
import { InferenceService } from '../../workers/inference/services/inference.service';

describe('ReflectionService', () => {
  let service: ReflectionService;

  beforeEach(async () => {
    const mockInferenceService = {
      infer: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          actualOutcome: 'Success',
          executionMistakes: [],
          unnecessaryToolUsage: [],
          missingKnowledge: [],
          suggestedImprovements: ['None'],
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReflectionService,
        { provide: InferenceService, useValue: mockInferenceService },
      ],
    }).compile();

    service = module.get<ReflectionService>(ReflectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return a ReflectionReport', async () => {
    const report = await service.reflect(
      'goal-1',
      'plan-1',
      'expected',
      'trace',
      true,
    );
    expect(report.actualOutcome).toBe('Success');
    expect(report.suggestedImprovements[0]).toBe('None');
  });
});
