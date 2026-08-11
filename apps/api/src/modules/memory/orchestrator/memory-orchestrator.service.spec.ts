import { Test, TestingModule } from '@nestjs/testing';
import { MemoryOrchestratorService } from './memory-orchestrator.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExtractionPipelineService } from '../extractors/extraction-pipeline.service';
import { MemoryValidatorService } from '../validation/memory-validator.service';
import { ConversationsService } from '../../conversations/conversations.service';

describe('MemoryOrchestratorService', () => {
  let service: MemoryOrchestratorService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const mockEventEmitter = {
      emit: jest.fn(),
    };
    const mockExtractionPipeline = {
      extractAll: jest
        .fn()
        .mockResolvedValue([{ type: 'PROJECT', data: { name: 'Test' } }]),
    };
    const mockValidator = {
      validate: jest.fn().mockImplementation((memories) => memories),
    };
    const mockConversationsService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryOrchestratorService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
        {
          provide: ExtractionPipelineService,
          useValue: mockExtractionPipeline,
        },
        { provide: MemoryValidatorService, useValue: mockValidator },
        { provide: ConversationsService, useValue: mockConversationsService },
      ],
    }).compile();

    service = module.get<MemoryOrchestratorService>(MemoryOrchestratorService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should process a conversation turn and route extracted memories', async () => {
    await service.handleConversation({
      conversationId: 'conv-1',
      userId: 'user-1',
      userMessageId: 'msg-user-1',
      assistantMessageId: 'msg-assistant-1',
      userMessage: 'Hello',
      assistantMessage: 'Hi there',
      createdAt: new Date(),
    });

    expect(eventEmitter.emit).toHaveBeenCalledWith('memory.project.extracted', {
      userId: 'user-1',
      name: 'Test',
    });
  });
});
