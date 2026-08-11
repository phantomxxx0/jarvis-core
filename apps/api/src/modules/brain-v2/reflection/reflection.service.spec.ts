import { Test, TestingModule } from '@nestjs/testing';
import { ReflectionGateway } from './reflection.service';
import { InferenceService } from '../../workers/inference/services/inference.service';
import { InferenceProviderType } from '../../workers/inference/enums/provider.enum';
import { Verifier } from '../reasoning/verification';
import type { WorkingMemoryState } from '../contracts/working-memory';

/**
 * reflection.service.spec.ts
 *
 * Verifies ReflectionGateway's V2-native implementation: successful
 * structured reflection, non-throwing behavior on inference failure /
 * malformed JSON / empty response, the inference request contract,
 * continued use of Verifier, and the absence of any V1
 * ReflectionService dependency.
 */

const mockInferenceService = {
  infer: jest.fn(),
};

function makeMemorySnapshot(): WorkingMemoryState {
  return {
    toolOutputs: {},
    retrievedFacts: [],
  } as unknown as WorkingMemoryState;
}

describe('ReflectionGateway', () => {
  let gateway: ReflectionGateway;

  beforeEach(async () => {
    mockInferenceService.infer.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReflectionGateway,
        { provide: InferenceService, useValue: mockInferenceService },
      ],
    }).compile();

    gateway = module.get<ReflectionGateway>(ReflectionGateway);
  });

  it('completes successfully on a valid structured reflection response', async () => {
    const structured = {
      actualOutcome: 'The tool call succeeded and the goal was met.',
      executionMistakes: [],
      unnecessaryToolUsage: [],
      missingKnowledge: [],
      suggestedImprovements: ['Cache the lookup next time.'],
    };

    mockInferenceService.infer.mockResolvedValue({
      success: true,
      content: JSON.stringify(structured),
      generatedAt: new Date(),
    });

    await expect(
      gateway.reflect(
        'goal-1',
        'plan-1',
        'read README.md',
        'Here is the README content.',
        makeMemorySnapshot(),
      ),
    ).resolves.toBeUndefined();

    expect(mockInferenceService.infer).toHaveBeenCalledTimes(1);
  });

  it('resolves without throwing when inference rejects', async () => {
    mockInferenceService.infer.mockRejectedValue(
      new Error('inference provider unreachable'),
    );

    await expect(
      gateway.reflect(
        'goal-2',
        'plan-2',
        'do something',
        'a response',
        makeMemorySnapshot(),
      ),
    ).resolves.toBeUndefined();
  });

  it('resolves without throwing when the response content is malformed JSON', async () => {
    mockInferenceService.infer.mockResolvedValue({
      success: true,
      content: 'this is not valid json at all {{{',
      generatedAt: new Date(),
    });

    await expect(
      gateway.reflect(
        'goal-3',
        'plan-3',
        'goal text',
        'a response',
        makeMemorySnapshot(),
      ),
    ).resolves.toBeUndefined();
  });

  it('resolves without throwing when the response content is empty', async () => {
    mockInferenceService.infer.mockResolvedValue({
      success: true,
      content: undefined,
      generatedAt: new Date(),
    });

    await expect(
      gateway.reflect(
        'goal-4',
        'plan-4',
        'goal text',
        'a response',
        makeMemorySnapshot(),
      ),
    ).resolves.toBeUndefined();
  });

  it('calls InferenceService.infer with the OLLAMA provider, expected model, and equivalent request contract', async () => {
    mockInferenceService.infer.mockResolvedValue({
      success: true,
      content: JSON.stringify({
        actualOutcome: 'x',
        executionMistakes: [],
        unnecessaryToolUsage: [],
        missingKnowledge: [],
        suggestedImprovements: [],
      }),
      generatedAt: new Date(),
    });

    await gateway.reflect(
      'goal-5',
      'plan-5',
      'the goal text',
      'the generated response',
      makeMemorySnapshot(),
    );

    expect(mockInferenceService.infer).toHaveBeenCalledTimes(1);
    const [providerType, request] = mockInferenceService.infer.mock.calls[0];

    expect(providerType).toBe(InferenceProviderType.OLLAMA);
    expect(request.modelId).toBe('llama3.1:8b');
    expect(request.temperature).toBe(0.1);
    expect(request.responseFormat).toBe('json_object');

    expect(request.systemPrompt).toContain('the goal text');
    expect(request.systemPrompt).toContain('actualOutcome');
    expect(request.systemPrompt).toContain('executionMistakes');
    expect(request.systemPrompt).toContain('unnecessaryToolUsage');
    expect(request.systemPrompt).toContain('missingKnowledge');
    expect(request.systemPrompt).toContain('suggestedImprovements');
  });

  it('invokes Verifier.verifyResponse with the generated response', async () => {
    const spy = jest.spyOn(Verifier, 'verifyResponse');

    mockInferenceService.infer.mockResolvedValue({
      success: true,
      content: JSON.stringify({
        actualOutcome: 'x',
        executionMistakes: [],
        unnecessaryToolUsage: [],
        missingKnowledge: [],
        suggestedImprovements: [],
      }),
      generatedAt: new Date(),
    });

    await gateway.reflect(
      'goal-6',
      'plan-6',
      'goal text',
      'the exact generated response',
      makeMemorySnapshot(),
    );

    expect(spy).toHaveBeenCalledWith('the exact generated response');

    spy.mockRestore();
  });

  it('does not provide or depend on V1 ReflectionService', async () => {
    // The TestingModule above only provides ReflectionGateway and a mock
    // InferenceService. If ReflectionGateway still required
    // ReflectionService, module compilation in beforeEach would have
    // thrown UnknownDependenciesException before any test ran.
    expect(gateway).toBeDefined();
  });
});
