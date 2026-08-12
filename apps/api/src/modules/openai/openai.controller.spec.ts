import { Test, TestingModule } from '@nestjs/testing';
import { OpenAIController } from './openai.controller';
import { BrainRouterService } from '../brain-router/brain-router.service';
import { ApiKeyAuthGuard } from '../auth/guards/api-key-auth.guard';
import { Response, Request } from 'express';
import { ChatCompletionDto } from './dto/chat-completion.dto';

describe('OpenAIController', () => {
  let controller: OpenAIController;
  let brainService: jest.Mocked<BrainRouterService>;

  beforeEach(async () => {
    brainService = {
      processRequest: jest.fn(),
      think: jest.fn(),
    } as unknown as jest.Mocked<BrainRouterService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAIController],
      providers: [
        {
          provide: BrainRouterService,
          useValue: brainService,
        },
      ],
    })
      .overrideGuard(ApiKeyAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<OpenAIController>(OpenAIController);
  });

  describe('getModels', () => {
    it('should return a list of models', () => {
      const models = controller.getModels();
      expect(models.object).toBe('list');
      expect(models.data[0].id).toBe('jarvis-core');
    });
  });

  describe('chatCompletions', () => {
    const mockRequest = {
      user: { id: 'test-user-id' },
    } as unknown as Request;

    const mockResponse = {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as unknown as Response;

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return standard JSON completion when stream is false', async () => {
      brainService.processRequest.mockResolvedValue({ answer: 'Hello World', traceId: '123' });

      const dto: ChatCompletionDto = {
        model: 'jarvis-core',
        messages: [{ role: 'user', content: 'Say hello' }],
        stream: false,
      };

      await controller.chatCompletions(mockRequest, dto, mockResponse);

      expect(brainService.processRequest).toHaveBeenCalledWith(
        'Say hello',
        'test-user-id',
        expect.any(String),
      );
      
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          object: 'chat.completion',
          choices: [
            expect.objectContaining({
              message: { role: 'assistant', content: 'Hello World' },
            }),
          ],
        }),
      );
    });

    it('should return SSE stream when stream is true', async () => {
      brainService.think.mockImplementation(async (msg, userId, sessionId, onProgress) => {
        onProgress?.('token', { content: 'Hello' });
        onProgress?.('token', { content: ' World' });
        return 'Hello World';
      });

      const dto: ChatCompletionDto = {
        model: 'jarvis-core',
        messages: [{ role: 'user', content: 'Say hello' }],
        stream: true,
      };

      await controller.chatCompletions(mockRequest, dto, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('"content":"Hello"'));
      expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('"content":" World"'));
      expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('[DONE]'));
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should handle internal errors gracefully in non-stream mode', async () => {
      brainService.processRequest.mockRejectedValue(new Error('Brain fail'));

      const dto: ChatCompletionDto = {
        model: 'jarvis-core',
        messages: [{ role: 'user', content: 'Say hello' }],
        stream: false,
      };

      await controller.chatCompletions(mockRequest, dto, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Brain fail',
          }),
        }),
      );
    });

    it('should handle internal errors gracefully in stream mode', async () => {
      brainService.think.mockRejectedValue(new Error('Brain stream fail'));

      const dto: ChatCompletionDto = {
        model: 'jarvis-core',
        messages: [{ role: 'user', content: 'Say hello' }],
        stream: true,
      };

      await controller.chatCompletions(mockRequest, dto, mockResponse);

      expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('Brain stream fail'));
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});
