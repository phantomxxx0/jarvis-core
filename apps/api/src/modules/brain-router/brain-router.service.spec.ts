import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BrainRouterService } from './brain-router.service';
import { BrainService } from '../brain/brain.service';
import { BrainV2Service } from '../brain-v2/brain-v2.service';

/**
 * brain-router.service.spec.ts
 *
 * Verifies BrainRouterService.think()'s V1/V2 routing: correct branch
 * selection by USE_BRAIN_V2, incremental chunk forwarding on the V2
 * path, normal V2 results passing through unchanged, V2 fail-closed
 * fallback results being normalized into a thrown error, and V1 errors
 * continuing to propagate unchanged.
 */

function makeBrainOutput(overrides: Record<string, any> = {}) {
  return {
    sessionId: 'session-x',
    content: 'the v2 answer',
    modality: 'text',
    latencyMs: 10,
    respondedAt: new Date(),
    ...overrides,
    cognitiveTrace: {
      traceId: 'trace-x',
      usedFallback: false,
      ...(overrides.cognitiveTrace || {}),
    },
  };
}

describe('BrainRouterService.think()', () => {
  let brainV1: { think: jest.Mock; processChat: jest.Mock };
  let brainV2: { process: jest.Mock; processStream: jest.Mock };

  async function build(useV2: boolean): Promise<BrainRouterService> {
    brainV1 = { think: jest.fn(), processChat: jest.fn() };
    brainV2 = { process: jest.fn(), processStream: jest.fn() };

    const configMock = {
      get: jest.fn((key: string) =>
        key === 'USE_BRAIN_V2' ? String(useV2) : undefined,
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrainRouterService,
        { provide: ConfigService, useValue: configMock },
        { provide: BrainService, useValue: brainV1 },
        { provide: BrainV2Service, useValue: brainV2 },
      ],
    }).compile();

    return module.get<BrainRouterService>(BrainRouterService);
  }

  it('useV2=true: calls BrainV2Service.processStream() and does NOT call BrainService.think()', async () => {
    const router = await build(true);
    brainV2.processStream.mockResolvedValue(makeBrainOutput());

    await router.think('hello', 'user-1', jest.fn());

    expect(brainV2.processStream).toHaveBeenCalledTimes(1);
    expect(brainV1.think).not.toHaveBeenCalled();
  });

  it('useV2=false: calls BrainService.think() and does NOT call BrainV2Service.processStream()', async () => {
    const router = await build(false);
    brainV1.think.mockResolvedValue('the v1 answer');

    const onProgress = jest.fn();
    const result = await router.think('hello', 'user-1', onProgress);

    expect(brainV1.think).toHaveBeenCalledWith('hello', 'user-1', onProgress);
    expect(brainV2.processStream).not.toHaveBeenCalled();
    expect(result).toBe('the v1 answer');
  });

  it('useV2=true: forwards each V2 chunk through onProgress as a token event', async () => {
    const router = await build(true);

    brainV2.processStream.mockImplementation(
      async (_input: unknown, onChunk: (chunk: string) => void) => {
        onChunk('Hel');
        onChunk('lo');
        return makeBrainOutput({ content: 'Hello' });
      },
    );

    const onProgress = jest.fn();
    await router.think('hi', 'user-1', onProgress);

    expect(onProgress).toHaveBeenCalledWith('token', { content: 'Hel' });
    expect(onProgress).toHaveBeenCalledWith('token', { content: 'lo' });
  });

  it('useV2=true: returns the V2 content unchanged for a normal (non-fallback) result', async () => {
    const router = await build(true);
    brainV2.processStream.mockResolvedValue(
      makeBrainOutput({ content: 'a normal V2 answer' }),
    );

    const result = await router.think('hi', 'user-1', jest.fn());

    expect(result).toBe('a normal V2 answer');
  });

  it('useV2=true: throws when the V2 result has cognitiveTrace.usedFallback === true', async () => {
    const router = await build(true);
    brainV2.processStream.mockResolvedValue(
      makeBrainOutput({
        cognitiveTrace: { traceId: 't', usedFallback: true },
      }),
    );

    await expect(router.think('hi', 'user-1', jest.fn())).rejects.toThrow();
  });

  it('useV1: errors from BrainService.think() propagate unchanged', async () => {
    const router = await build(false);
    brainV1.think.mockRejectedValue(new Error('v1 boom'));

    await expect(router.think('hi', 'user-1', jest.fn())).rejects.toThrow(
      'v1 boom',
    );
  });
});
