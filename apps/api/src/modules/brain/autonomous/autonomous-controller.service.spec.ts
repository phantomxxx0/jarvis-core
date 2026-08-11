import { Test, TestingModule } from '@nestjs/testing';
import { AutonomousExecutionController } from './autonomous-controller.service';
import { RuntimeContextService } from '../context/runtime-context.service';
import { ReasonerService } from '../reasoner/reasoner.service';
import { PlannerService } from '../planner/planner.service';
import { ExecutionRunnerService } from '../execution/execution-runner.service';
import { ReflectionService } from '../reflection/reflection.service';
import { LearningService } from '../learning/learning.service';
import { ContextComposerService } from '../../memory/retrieval/context-composer.service';
import { IntentService } from '../intent/intent.service';
import { ConversationsService } from '../../conversations/conversations.service';
import { WorkerRegistryService } from '../../workers/registry/worker-registry.service';
import { IdentityService } from '../../governance/identity/identity.service';

describe('AutonomousExecutionController', () => {
  let service: AutonomousExecutionController;

  beforeEach(async () => {
    const mockContext = {
      buildRuntimeContext: jest.fn().mockResolvedValue({ contextText: '' }),
    };
    const mockReasoner = {
      reason: jest.fn().mockResolvedValue({
        requiresClarification: false,
        isAutonomousSafe: true,
      }),
    };
    const mockPlanner = {
      createPlan: jest.fn().mockResolvedValue({ steps: [] }),
    };
    const mockRunner = { executeTask: jest.fn() };
    const mockReflection = {
      reflect: jest.fn().mockResolvedValue({
        success: true,
        executionMistakes: [],
        suggestedImprovements: [],
      }),
    };
    const mockLearning = { learn: jest.fn() };
    const mockContextComposer = { compose: jest.fn().mockResolvedValue('mock context') };
    const mockIntent = { extractIntent: jest.fn().mockResolvedValue({ type: 'test', requiresWorkers: false }) };
    const mockConversations = { getRecentMessages: jest.fn().mockResolvedValue([]), saveMessage: jest.fn().mockResolvedValue(undefined), saveInteractionTurn: jest.fn().mockResolvedValue(undefined) };
    const mockWorkerRegistry = { discover: jest.fn().mockResolvedValue([]) };
    const mockIdentity = { buildContext: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutonomousExecutionController,
        { provide: RuntimeContextService, useValue: mockContext },
        { provide: ReasonerService, useValue: mockReasoner },
        { provide: PlannerService, useValue: mockPlanner },
        { provide: ExecutionRunnerService, useValue: mockRunner },
        { provide: ReflectionService, useValue: mockReflection },
        { provide: ContextComposerService, useValue: mockContextComposer },
        { provide: LearningService, useValue: mockLearning },
        { provide: IntentService, useValue: mockIntent },
        { provide: ConversationsService, useValue: mockConversations },
        { provide: WorkerRegistryService, useValue: mockWorkerRegistry },
        { provide: IdentityService, useValue: mockIdentity },
      ],
    }).compile();

    service = module.get<AutonomousExecutionController>(
      AutonomousExecutionController,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should complete autonomous loop', async () => {
    await expect(
      service.executeGoal('Test', 'user-1'),
    ).resolves.toMatchObject({ success: true });
  });
});
