import { Test, TestingModule } from '@nestjs/testing';
import { AIController } from './ai.controller';
import { BrainRouterService } from '../brain-router/brain-router.service';
import type { ChatDto } from './dto/chat.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * ai.controller.spec.ts
 *
 * Verifies AIController.streamChat()'s SSE behavior across both the V1
 * and V2 BrainRouterService.think() paths: incremental token forwarding
 * on V2, no duplicate final token when V2 already streamed, exactly one
 * completion event, error events on failure, and unchanged V1 behavior
 * (single full-answer token, no incremental tokens).
 */

function makeMockResponse() {
  const written: Array<{ event: string; data: unknown }> = [];

  const res: any = {
    setHeader: jest.fn(),
    flushHeaders: jest.fn(),
    write: jest.fn((chunk: string) => {
      const match = /^event: (.+)\ndata: (.+)\n\n$/.exec(chunk);
      if (match) {
        written.push({ event: match[1], data: JSON.parse(match[2]) });
      }
      return true;
    }),
    end: jest.fn(),
  };

  return { res, written };
}

const user: JwtPayload = { id: 'user-1' } as JwtPayload;
const dto: ChatDto = { messages: [{ role: 'user', content: 'hello' }] } as ChatDto;

describe('AIController.streamChat()', () => {
  let controller: AIController;
  let brainService: { think: jest.Mock };

  beforeEach(async () => {
    brainService = { think: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AIController],
      providers: [{ provide: BrainRouterService, useValue: brainService }],
    }).compile();

    controller = module.get<AIController>(AIController);
  });

  it('V2 path: forwards each incremental token event as it is received', async () => {
    brainService.think.mockImplementation(
      async (
        _prompt: string,
        _userId: string,
        onProgress?: (event: string, data: any) => void,
      ) => {
        onProgress?.('token', { content: 'Hel' });
        onProgress?.('token', { content: 'lo' });
        return 'Hello';
      },
    );

    const { res, written } = makeMockResponse();
    await controller.streamChat(user, dto, res);

    const tokenEvents = written.filter((w) => w.event === 'token');
    expect(tokenEvents).toEqual([
      { event: 'token', data: { content: 'Hel' } },
      { event: 'token', data: { content: 'lo' } },
    ]);
  });

  it('V2 path: does NOT emit a duplicate final full-answer token after incremental tokens were streamed', async () => {
    brainService.think.mockImplementation(
      async (
        _prompt: string,
        _userId: string,
        onProgress?: (event: string, data: any) => void,
      ) => {
        onProgress?.('token', { content: 'Hel' });
        onProgress?.('token', { content: 'lo' });
        return 'Hello';
      },
    );

    const { res, written } = makeMockResponse();
    await controller.streamChat(user, dto, res);

    const tokenEvents = written.filter((w) => w.event === 'token');
    // Exactly the two incremental chunks — no additional full-answer token.
    expect(tokenEvents).toHaveLength(2);
    expect(tokenEvents.some((w) => (w.data as any).content === 'Hello')).toBe(
      false,
    );
  });

  it('V2 path: emits completion exactly once', async () => {
    brainService.think.mockImplementation(
      async (
        _prompt: string,
        _userId: string,
        onProgress?: (event: string, data: any) => void,
      ) => {
        onProgress?.('token', { content: 'Hi' });
        return 'Hi';
      },
    );

    const { res, written } = makeMockResponse();
    await controller.streamChat(user, dto, res);

    const completeEvents = written.filter((w) => w.event === 'complete');
    expect(completeEvents).toHaveLength(1);
    expect(completeEvents[0].data).toEqual({ success: true });
  });

  it('V2 path: an error produces the existing SSE error event', async () => {
    brainService.think.mockRejectedValue(new Error('v2 boom'));

    const { res, written } = makeMockResponse();
    await controller.streamChat(user, dto, res);

    const errorEvents = written.filter((w) => w.event === 'error');
    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0].data).toEqual({ message: 'v2 boom' });

    const completeEvents = written.filter((w) => w.event === 'complete');
    expect(completeEvents).toHaveLength(0);
  });

  it('V1 path: unchanged — only "status" events via onProgress, single full-answer token emitted at the end', async () => {
    brainService.think.mockImplementation(
      async (
        _prompt: string,
        _userId: string,
        onProgress?: (event: string, data: any) => void,
      ) => {
        onProgress?.('status', {
          message: 'Delegating to Autonomous Execution Controller...',
        });
        return 'the full v1 answer';
      },
    );

    const { res, written } = makeMockResponse();
    await controller.streamChat(user, dto, res);

    const tokenEvents = written.filter((w) => w.event === 'token');
    expect(tokenEvents).toHaveLength(1);
    expect(tokenEvents[0].data).toEqual({ content: 'the full v1 answer' });

    const completeEvents = written.filter((w) => w.event === 'complete');
    expect(completeEvents).toHaveLength(1);

    const errorEvents = written.filter((w) => w.event === 'error');
    expect(errorEvents).toHaveLength(0);
  });

  it('response is always ended, on both success and error', async () => {
    brainService.think.mockResolvedValue('ok');
    const { res: res1 } = makeMockResponse();
    await controller.streamChat(user, dto, res1);
    expect(res1.end).toHaveBeenCalledTimes(1);

    brainService.think.mockRejectedValue(new Error('boom'));
    const { res: res2 } = makeMockResponse();
    await controller.streamChat(user, dto, res2);
    expect(res2.end).toHaveBeenCalledTimes(1);
  });
});
