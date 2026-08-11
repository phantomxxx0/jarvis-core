/// <reference types="jest" />

import { BrainV2Service } from './brain-v2.service';
import { BrainV2Event } from './events/brain.events';
import type { BrainInput } from './contracts/brain-input';
import type { ExecutiveDecision } from './contracts/executive-decision';

function makeInput(): BrainInput {
  return {
    userId: 'user-1',
    sessionId: 'session-1',
    timestamp: new Date(),
    modality: 'text',
    rawInput: 'hello',
    metadata: {},
  };
}

function makeDecision(overrides: Partial<ExecutiveDecision> = {}): ExecutiveDecision {
  return {
    executionPath: 'IMMEDIATE',
    retrieveMemory: false,
    reason: false,
    plan: false,
    useTool: false,
    rationale: 'test rationale',
    confidence: 0.9,
    respondImmediately: true,
    runReflectionAsync: false,
    runLearningAsync: true,
    latencyBudgetMs: 500,
    decidedAt: new Date(),
    ...overrides,
  } as ExecutiveDecision;
}

async function* twoChunkStream() {
  yield 'Hello';
  yield ' world';
}

describe('BrainV2Service.processStream', () => {
  let perception: { perceive: jest.Mock };
  let attention: { analyze: jest.Mock };
  let executive: { process: jest.Mock };
  let language: { generate: jest.Mock; generateStream: jest.Mock };
  let workingMemory: {
    create: jest.Mock;
    seedConversationHistory: jest.Mock;
    applyAttention: jest.Mock;
    snapshot: jest.Mock;
  };
  let emotion: { update: jest.Mock };
  let scheduler: { enqueue: jest.Mock };
  let reflection: { reflect: jest.Mock };
  let learning: { learn: jest.Mock };
  let internalState: { onCycleStart: jest.Mock; onCycleComplete: jest.Mock };
  let cognitionMetrics: { record: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let v1Brain: Record<string, unknown>;
  let usersService: { findById: jest.Mock };
  let conversationsService: { getRecentMessages: jest.Mock; saveInteractionTurn: jest.Mock };
  let preferenceMemory: { retrieve: jest.Mock };
  let identityService: { buildContext: jest.Mock };

  let enqueuedPromises: Promise<void>[];

  let service: BrainV2Service;

  beforeEach(() => {
    enqueuedPromises = [];

    perception = {
      perceive: jest.fn().mockResolvedValue({
        normalizedInput: 'hello',
        sessionId: 'session-1',
        userId: 'user-1',
        modality: 'text',
      }),
    };
    attention = {
      analyze: jest.fn().mockReturnValue({ emotion: 'NEUTRAL', topicTags: [] }),
    };
    executive = {
      process: jest.fn().mockResolvedValue(makeDecision()),
    };
    language = {
      generate: jest.fn(),
      generateStream: jest.fn().mockImplementation(() => twoChunkStream()),
    };
    workingMemory = {
      create: jest.fn().mockReturnValue({
        sessionId: 'session-1',
        userId: 'user-1',
        conversationHistory: [],
        userIdentity: { facts: {} },
        currentGoal: null,
        focusStack: [],
        retrievedFacts: [],
        toolOutputs: {},
        emotionalState: 'NEUTRAL',
        attentionFocus: null,
        scratch: {},
        initializedAt: new Date(),
      }),
      seedConversationHistory: jest.fn(),
      applyAttention: jest.fn(),
      snapshot: jest.fn().mockReturnValue({ toolOutputs: {}, retrievedFacts: [] }),
    };
    emotion = { update: jest.fn() };
    scheduler = {
      enqueue: jest.fn((_name: string, execute: () => Promise<void>) => {
        enqueuedPromises.push(execute());
      }),
    };
    reflection = { reflect: jest.fn().mockResolvedValue(undefined) };
    learning = { learn: jest.fn().mockResolvedValue(undefined) };
    internalState = { onCycleStart: jest.fn(), onCycleComplete: jest.fn() };
    cognitionMetrics = { record: jest.fn() };
    eventEmitter = { emit: jest.fn() };
    v1Brain = {};
    usersService = { findById: jest.fn().mockResolvedValue({ name: 'Alex' }) };
    conversationsService = {
      getRecentMessages: jest.fn().mockResolvedValue([]),
      saveInteractionTurn: jest.fn().mockResolvedValue(undefined),
    };
    preferenceMemory = { retrieve: jest.fn().mockResolvedValue([]) };
    identityService = {
      buildContext: jest.fn().mockResolvedValue({
        principal: { id: 'user-1', permissions: [] },
        requestId: 'req-1',
        traceId: 'trace-1',
        createdAt: new Date(),
      }),
    };

    service = new BrainV2Service(
      perception as any,
      attention as any,
      executive as any,
      language as any,
      workingMemory as any,
      emotion as any,
      scheduler as any,
      reflection as any,
      learning as any,
      internalState as any,
      cognitionMetrics as any,
      eventEmitter as any,
      usersService as any,
      conversationsService as any,
      preferenceMemory as any,
      identityService as any,
    );
  });

  it('performs cognitive preparation once and builds executionContext', async () => {
    await service.processStream(makeInput(), () => {});

    expect(perception.perceive).toHaveBeenCalledTimes(1);
    expect(identityService.buildContext).toHaveBeenCalledTimes(1);
    expect(identityService.buildContext).toHaveBeenCalledWith({
      id: 'user-1',
      sessionId: 'session-1',
    });
    expect(conversationsService.getRecentMessages).toHaveBeenCalledWith('user-1', 10);
  });

  it('runs ExecutiveService.process exactly once', async () => {
    await service.processStream(makeInput(), () => {});
    expect(executive.process).toHaveBeenCalledTimes(1);
  });

  it('consumes generateStream and forwards chunks in order, accumulating into BrainOutput.content', async () => {
    const chunks: string[] = [];
    const output = await service.processStream(makeInput(), (c) => chunks.push(c));

    expect(language.generateStream).toHaveBeenCalledTimes(1);
    expect(chunks).toEqual(['Hello', ' world']);
    expect(output.content).toBe('Hello world');
  });

  it('saves the interaction turn exactly once after successful completion', async () => {
    await service.processStream(makeInput(), () => {});
    await Promise.all(enqueuedPromises);

    expect(conversationsService.saveInteractionTurn).toHaveBeenCalledTimes(1);
    expect(conversationsService.saveInteractionTurn).toHaveBeenCalledWith(
      'user-1',
      'hello',
      'Hello world',
    );
  });

  it('schedules learning exactly once', async () => {
    await service.processStream(makeInput(), () => {});
    await Promise.all(enqueuedPromises);

    expect(learning.learn).toHaveBeenCalledTimes(1);
  });

  it('schedules reflection only when the decision requires it', async () => {
    executive.process.mockResolvedValue(makeDecision({ reason: true }));

    await service.processStream(makeInput(), () => {});
    await Promise.all(enqueuedPromises);

    expect(reflection.reflect).toHaveBeenCalledTimes(1);
  });

  it('does not schedule reflection when the decision does not require it', async () => {
    executive.process.mockResolvedValue(makeDecision({ reason: false, plan: false }));

    await service.processStream(makeInput(), () => {});
    await Promise.all(enqueuedPromises);

    expect(reflection.reflect).not.toHaveBeenCalled();
  });

  it('emits RESPONSE_READY exactly once on success', async () => {
    await service.processStream(makeInput(), () => {});

    const responseReadyCalls = eventEmitter.emit.mock.calls.filter(
      ([event]) => event === BrainV2Event.RESPONSE_READY,
    );
    expect(responseReadyCalls).toHaveLength(1);
  });

  it('on a mid-stream error: does not duplicate persistence/scheduling and propagates the error', async () => {
    language.generateStream.mockImplementation(async function* () {
      yield 'Hello';
      throw new Error('simulated stream failure');
    });

    const chunks: string[] = [];

    await expect(
      service.processStream(makeInput(), (c) => chunks.push(c)),
    ).rejects.toThrow('simulated stream failure');

    // Partial content was still forwarded before the failure.
    expect(chunks).toEqual(['Hello']);

    // No side effects scheduled.
    expect(scheduler.enqueue).not.toHaveBeenCalled();
    expect(conversationsService.saveInteractionTurn).not.toHaveBeenCalled();
    expect(reflection.reflect).not.toHaveBeenCalled();
    expect(learning.learn).not.toHaveBeenCalled();

    const responseReadyCalls = eventEmitter.emit.mock.calls.filter(
      ([event]) => event === BrainV2Event.RESPONSE_READY,
    );
    expect(responseReadyCalls).toHaveLength(0);

    const errorCalls = eventEmitter.emit.mock.calls.filter(
      ([event]) => event === BrainV2Event.COGNITIVE_ERROR,
    );
    expect(errorCalls).toHaveLength(1);
  });

  it('remains fail-closed when identity/buildContext fails: no streaming, no Executive call, returns fallback BrainOutput', async () => {
    identityService.buildContext.mockRejectedValue(new Error('identity fail'));

    const chunks: string[] = [];
    const output = await service.processStream(makeInput(), (c) => chunks.push(c));

    expect(executive.process).not.toHaveBeenCalled();
    expect(language.generateStream).not.toHaveBeenCalled();
    expect(chunks).toEqual([]);

    // Resolves (does not throw) with the same graceful fallback shape process() uses.
    expect(output.cognitiveTrace.usedFallback).toBe(true);
    expect(output.content).toContain('unexpected cognitive failure');

    const errorCalls = eventEmitter.emit.mock.calls.filter(
      ([event]) => event === BrainV2Event.COGNITIVE_ERROR,
    );
    expect(errorCalls).toHaveLength(1);

    // Fail-closed: no side effects run for a pre-stream failure either.
    expect(scheduler.enqueue).not.toHaveBeenCalled();
  });
});
