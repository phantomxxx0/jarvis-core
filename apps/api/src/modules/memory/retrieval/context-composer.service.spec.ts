import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContextComposerService } from './context-composer.service';
import { GraphMemoryService } from '../graph/graph-memory.service';
import { EpisodicMemoryService } from '../episodic/episodic-memory.service';
import { SemanticMemoryService } from '../semantic/semantic-memory.service';
import { ProceduralMemoryService } from '../procedural/procedural-memory.service';
import { ProjectMemoryService } from '../adapters/project-memory.service';
import { DeviceMemoryService } from '../adapters/device-memory.service';
import { PreferenceMemoryService } from '../adapters/preference-memory.service';
import { GoalMemoryService } from '../adapters/goal-memory.service';
import { MemoryRankingService } from '../ranking/memory-ranking.service';
import { ConversationsService } from '../../conversations/conversations.service';
import { MemoryRetrievalParams } from '../interfaces/memory-service.interface';

describe('ContextComposerService', () => {
  let service: ContextComposerService;
  let graphMemory: jest.Mocked<GraphMemoryService>;
  let semanticMemory: jest.Mocked<SemanticMemoryService>;
  let episodicMemory: jest.Mocked<EpisodicMemoryService>;
  let preferenceMemory: jest.Mocked<PreferenceMemoryService>;
  let projectMemory: jest.Mocked<ProjectMemoryService>;
  let goalMemory: jest.Mocked<GoalMemoryService>;
  let proceduralMemory: jest.Mocked<ProceduralMemoryService>;
  let deviceMemory: jest.Mocked<DeviceMemoryService>;
  let memoryRanking: jest.Mocked<MemoryRankingService>;
  let conversationsService: jest.Mocked<ConversationsService>;
  
  beforeEach(async () => {
    // Mock memory services
    const createMockService = () => ({
      composeContext: jest.fn().mockResolvedValue([]),
    });

    graphMemory = createMockService() as any;
    semanticMemory = createMockService() as any;
    episodicMemory = createMockService() as any;
    preferenceMemory = createMockService() as any;
    projectMemory = createMockService() as any;
    goalMemory = createMockService() as any;
    proceduralMemory = createMockService() as any;
    deviceMemory = createMockService() as any;
    
    // Partially mock Ranking & Conversations
    memoryRanking = {
      rank: jest.fn().mockImplementation((contexts) => Promise.resolve(contexts)),
    } as any;
    
    conversationsService = {
      getRecentMessages: jest.fn().mockResolvedValue([]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextComposerService,
        { provide: GraphMemoryService, useValue: graphMemory },
        { provide: SemanticMemoryService, useValue: semanticMemory },
        { provide: EpisodicMemoryService, useValue: episodicMemory },
        { provide: ProceduralMemoryService, useValue: proceduralMemory },
        { provide: ProjectMemoryService, useValue: projectMemory },
        { provide: DeviceMemoryService, useValue: deviceMemory },
        { provide: PreferenceMemoryService, useValue: preferenceMemory },
        { provide: GoalMemoryService, useValue: goalMemory },
        { provide: MemoryRankingService, useValue: memoryRanking },
        { provide: ConversationsService, useValue: conversationsService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<ContextComposerService>(ContextComposerService);
  });

  it('should fall back to safe minimal providers (Graph, Semantic, Episodic, Preferences) if no policy is provided', async () => {
    await service.compose({ userId: 'u1', query: 'test' });
    expect(graphMemory.composeContext).toHaveBeenCalled();
    expect(semanticMemory.composeContext).toHaveBeenCalled();
    expect(episodicMemory.composeContext).toHaveBeenCalled();
    expect(preferenceMemory.composeContext).toHaveBeenCalled();
    
    // Unsafe providers should NOT be called
    expect(projectMemory.composeContext).not.toHaveBeenCalled();
    expect(goalMemory.composeContext).not.toHaveBeenCalled();
    expect(proceduralMemory.composeContext).not.toHaveBeenCalled();
    expect(deviceMemory.composeContext).not.toHaveBeenCalled();
  });

  it('should selectively execute semantic retrieval based on policy', async () => {
    const params: MemoryRetrievalParams = {
      userId: 'u1',
      query: 'test',
      policy: { querySemantic: true, queryGraph: false },
    };
    await service.compose(params);
    
    expect(semanticMemory.composeContext).toHaveBeenCalled();
    expect(graphMemory.composeContext).not.toHaveBeenCalled();
  });

  it('should selectively execute graph retrieval based on policy', async () => {
    const params: MemoryRetrievalParams = {
      userId: 'u1',
      query: 'test',
      policy: { querySemantic: false, queryGraph: true },
    };
    await service.compose(params);
    
    expect(graphMemory.composeContext).toHaveBeenCalled();
    expect(semanticMemory.composeContext).not.toHaveBeenCalled();
  });

  it('should query projects only when queryProjects is true, and goals only when queryGoals is true', async () => {
    await service.compose({ userId: 'u1', query: 'test', policy: { queryProjects: true } });
    expect(projectMemory.composeContext).toHaveBeenCalled();
    expect(goalMemory.composeContext).not.toHaveBeenCalled();

    jest.clearAllMocks();

    await service.compose({ userId: 'u1', query: 'test', policy: { queryGoals: true } });
    expect(projectMemory.composeContext).not.toHaveBeenCalled();
    expect(goalMemory.composeContext).toHaveBeenCalled();
  });

  it('identity loading should only request Preferences', async () => {
    await service.compose({ userId: 'u1', query: 'test', policy: { queryPreferences: true } });
    expect(preferenceMemory.composeContext).toHaveBeenCalled();
    expect(graphMemory.composeContext).not.toHaveBeenCalled();
    expect(semanticMemory.composeContext).not.toHaveBeenCalled();
  });

  it('should support multiple selected providers executing concurrently', async () => {
    const params: MemoryRetrievalParams = {
      userId: 'u1',
      query: 'test',
      policy: { querySemantic: true, queryGraph: true },
    };
    
    // Simulate some results
    semanticMemory.composeContext.mockResolvedValueOnce([{ content: 'semantic data', source: 'Semantic', confidence: 90 }]);
    graphMemory.composeContext.mockResolvedValueOnce([{ content: 'graph data', source: 'Graph', confidence: 90 }]);
    
    const result = await service.compose(params);
    
    expect(graphMemory.composeContext).toHaveBeenCalled();
    expect(semanticMemory.composeContext).toHaveBeenCalled();
    expect(result).toContain('semantic data');
    expect(result).toContain('graph data');
  });

  it('should isolate failures (one failing provider does not crash retrieval)', async () => {
    const params: MemoryRetrievalParams = {
      userId: 'u1',
      query: 'test',
      policy: { querySemantic: true, queryGraph: true },
    };
    
    // Make semantic fail, but graph succeed
    semanticMemory.composeContext.mockRejectedValueOnce(new Error('Vector DB Offline'));
    graphMemory.composeContext.mockResolvedValueOnce([{ content: 'graph data', source: 'Graph', confidence: 90 }]);
    
    const result = await service.compose(params);
    
    expect(result).toContain('graph data');
    expect(result).not.toContain('semantic data');
    expect(memoryRanking.rank).toHaveBeenCalled(); // Ranking still happens for the successful contexts
  });

  it('should retain existing ranking and context composition behavior', async () => {
    const params: MemoryRetrievalParams = {
      userId: 'u1',
      query: 'test',
      limit: 10,
      policy: { querySemantic: true }
    };
    
    // Use fallback to hit providers
    semanticMemory.composeContext.mockResolvedValueOnce([{ content: 'semantic', source: 'Semantic', confidence: 90 }]);
    
    await service.compose(params);
    
    expect(memoryRanking.rank).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ content: 'semantic' })]),
      10 // limit is passed through
    );
  });
});
