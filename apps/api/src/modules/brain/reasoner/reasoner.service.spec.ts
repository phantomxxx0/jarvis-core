import { Test, TestingModule } from '@nestjs/testing';
import { ReasonerService } from './reasoner.service';
import { InferenceService } from '../../workers/inference/services/inference.service';
import { ToolRegistryService } from '../../tools/tool-registry.service';

describe('ReasonerService', () => {
  let service: ReasonerService;

  beforeEach(async () => {
    const mockInferenceService = {
      infer: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          intent: 'Test',
          identifiedConstraints: [],
          missingInformation: [],
          estimatedComplexity: 'LOW',
          estimatedRisk: 'LOW',
          executionStrategy: 'DIRECT',
          requiresClarification: false,
          isAutonomousSafe: true,
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReasonerService,
        { provide: InferenceService, useValue: mockInferenceService },
        {
          provide: ToolRegistryService,
          useValue: { getAvailableTools: jest.fn().mockReturnValue([]) },
        },
      ],
    }).compile();

    service = module.get<ReasonerService>(ReasonerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return a valid ReasoningResult', async () => {
    const result = await service.reason('Test goal', 'Test context');
    expect(result.estimatedComplexity).toBe('LOW');
    expect(result.executionStrategy).toBe('DIRECT');
  });
});
