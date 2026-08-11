import { Test, TestingModule } from '@nestjs/testing';
import { LearningService } from './learning.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('LearningService', () => {
  let service: LearningService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<LearningService>(LearningService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should emit memory facts when lessons are learned', async () => {
    await service.learn(
      {
        goalId: 'g1',
        success: true,
        expectedOutcome: '',
        actualOutcome: '',
        executionMistakes: ['Mistake 1'],
        unnecessaryToolUsage: [],
        missingKnowledge: [],
        suggestedImprovements: ['Improvement 1'],
      },
      'user-1',
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'memory.fact.extracted',
      expect.any(Object),
    );
  });
});
