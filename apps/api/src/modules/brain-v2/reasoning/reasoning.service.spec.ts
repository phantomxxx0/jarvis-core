import { Test, TestingModule } from '@nestjs/testing';
import { ReasoningGateway } from './reasoning.service';
import { InferenceService } from '../../workers/inference/services/inference.service';
import { InferenceProviderType } from '../../workers/inference/enums/provider.enum';

/**
 * reasoning.service.spec.ts
 *
 * Verifies ReasoningGateway's V2-native implementation: successful
 * structured reasoning, conservative fail-closed fallback on inference
 * failure and malformed JSON, the inference request contract, and the
 * absence of any V1 ReasonerService dependency.
 */

const mockInferenceService = {
  infer: jest.fn(),
};

describe('ReasoningGateway', () => {
  let gateway: ReasoningGateway;

  beforeEach(async () => {
    mockInferenceService.infer.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReasoningGateway,
        { provide: InferenceService, useValue: mockInferenceService },
      ],
    }).compile();

    gateway = module.get<ReasoningGateway>(ReasoningGateway);
  });

  it('returns a fully populated ReasoningResultV2 on a successful structured response', async () => {
    const structured = {
      intent: 'Read a project file',
      identifiedConstraints: ['must be read-only'],
      missingInformation: [],
      estimatedComplexity: 'LOW',
      estimatedRisk: 'LOW',
      executionStrategy: 'DIRECT',
      requiresClarification: false,
      clarificationQuestions: [],
      isAutonomousSafe: true,
    };

    mockInferenceService.infer.mockResolvedValue({
      success: true,
      content: JSON.stringify(structured),
      generatedAt: new Date(),
    });

    const result = await gateway.reason('read README.md', 'no prior context');

    expect(result.intent).toBe(structured.intent);
    expect(result.identifiedConstraints).toEqual(structured.identifiedConstraints);
    expect(result.missingInformation).toEqual(structured.missingInformation);
    expect(result.estimatedComplexity).toBe('LOW');
    expect(result.estimatedRisk).toBe('LOW');
    expect(result.executionStrategy).toBe('DIRECT');
    expect(result.requiresClarification).toBe(false);
    expect(result.isAutonomousSafe).toBe(true);
    expect(result.reasonedAt).toBeInstanceOf(Date);
  });

  it('returns a conservative fallback when inference rejects, never a permissive result', async () => {
    mockInferenceService.infer.mockRejectedValue(new Error('inference provider unreachable'));

    const result = await gateway.reason('do something risky', 'context');

    expect(result.isAutonomousSafe).toBe(false);
    expect(result.estimatedRisk).toBe('HIGH');
    expect(result.executionStrategy).not.toBe('DIRECT');
    expect(result.requiresClarification).toBe(false);
    expect(result.reasonedAt).toBeInstanceOf(Date);
  });

  it('returns a conservative fallback when the response content is malformed/unparseable JSON', async () => {
    mockInferenceService.infer.mockResolvedValue({
      success: true,
      content: 'this is not valid json at all {{{',
      generatedAt: new Date(),
    });

    const result = await gateway.reason('goal', 'context');

    expect(result.isAutonomousSafe).toBe(false);
    expect(result.estimatedRisk).toBe('HIGH');
    expect(result.executionStrategy).toBe('PARALLEL_DAG');
  });

  it('returns a conservative fallback when the response content is empty', async () => {
    mockInferenceService.infer.mockResolvedValue({
      success: true,
      content: undefined,
      generatedAt: new Date(),
    });

    const result = await gateway.reason('goal', 'context');

    expect(result.isAutonomousSafe).toBe(false);
    expect(result.estimatedRisk).toBe('HIGH');
  });

  it('calls InferenceService.infer with the OLLAMA provider, expected model, and equivalent request contract', async () => {
    mockInferenceService.infer.mockResolvedValue({
      success: true,
      content: JSON.stringify({
        intent: 'x',
        identifiedConstraints: [],
        missingInformation: [],
        estimatedComplexity: 'LOW',
        estimatedRisk: 'LOW',
        executionStrategy: 'DIRECT',
        requiresClarification: false,
        isAutonomousSafe: true,
      }),
      generatedAt: new Date(),
    });

    await gateway.reason('the goal text', 'the context text');

    expect(mockInferenceService.infer).toHaveBeenCalledTimes(1);
    const [providerType, request] = mockInferenceService.infer.mock.calls[0];

    expect(providerType).toBe(InferenceProviderType.OLLAMA);
    expect(request.modelId).toBe('llama3.1:8b');
    expect(request.temperature).toBe(0.1);
    expect(request.responseFormat).toBe('json_object');

    // Assert important required field names/instructions are present in
    // the prompt, rather than the entire prompt as one brittle string.
    expect(request.systemPrompt).toContain('the goal text');
    expect(request.systemPrompt).toContain('the context text');
    expect(request.systemPrompt).toContain('intent');
    expect(request.systemPrompt).toContain('identifiedConstraints');
    expect(request.systemPrompt).toContain('missingInformation');
    expect(request.systemPrompt).toContain('estimatedComplexity');
    expect(request.systemPrompt).toContain('estimatedRisk');
    expect(request.systemPrompt).toContain('executionStrategy');
    expect(request.systemPrompt).toContain('requiresClarification');
    expect(request.systemPrompt).toContain('clarificationQuestions');
    expect(request.systemPrompt).toContain('isAutonomousSafe');
  });

  it('does not provide or depend on V1 ReasonerService', async () => {
    // The TestingModule above only provides ReasoningGateway and a mock
    // InferenceService. If ReasoningGateway still required
    // ReasonerService, module compilation in beforeEach would have
    // thrown UnknownDependenciesException before any test ran.
    expect(gateway).toBeDefined();
  });
});
