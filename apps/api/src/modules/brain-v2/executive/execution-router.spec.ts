/// <reference types="jest" />

import { ExecutionRouter } from './execution-router';
import type { AttentionResult } from '../contracts/attention-result';

describe('ExecutionRouter', () => {
  let router: ExecutionRouter;

  beforeEach(() => {
    router = new ExecutionRouter();
  });

  it('routes personal memory recall questions to memory retrieval', () => {
    const attention: AttentionResult = {
      importance: 70,
      urgency: 10,
      intent: 'QUESTION',
      intentConfidence: 0.8,
      emotion: 'NEUTRAL',
      novelty: 10,
      topicTags: ['favorite', 'colour'],
      isContinuation: false,
      analyzedAt: new Date(),
    };

    const decision = router.route(attention, 'what is my favourite colour');

    expect(decision.executionPath).toBe('MEMORY_RETRIEVAL');
    expect(decision.retrieveMemory).toBe(true);
    expect(decision.reason).toBe(false);
    expect(decision.plan).toBe(false);
    expect(decision.runReflectionAsync).toBe(false);
  });

  it('routes identity questions like who am I to memory retrieval', () => {
    const attention: AttentionResult = {
      importance: 60,
      urgency: 10,
      intent: 'QUESTION',
      intentConfidence: 0.8,
      emotion: 'NEUTRAL',
      novelty: 10,
      topicTags: ['identity'],
      isContinuation: false,
      analyzedAt: new Date(),
    };

    const decision = router.route(attention, 'who am i');

    expect(decision.executionPath).toBe('MEMORY_RETRIEVAL');
    expect(decision.retrieveMemory).toBe(true);
    expect(decision.reason).toBe(false);
    expect(decision.plan).toBe(false);
  });

  it('routes personal name questions to memory retrieval', () => {
    const attention: AttentionResult = {
      importance: 55,
      urgency: 10,
      intent: 'QUESTION',
      intentConfidence: 0.8,
      emotion: 'NEUTRAL',
      novelty: 10,
      topicTags: ['name'],
      isContinuation: false,
      analyzedAt: new Date(),
    };

    const decision = router.route(attention, 'what is my name');

    expect(decision.executionPath).toBe('MEMORY_RETRIEVAL');
    expect(decision.retrieveMemory).toBe(true);
  });

  it('routes simple arithmetic to immediate response with no cognitive overhead', () => {
    const attention: AttentionResult = {
      importance: 65,
      urgency: 10,
      intent: 'RESEARCH',
      intentConfidence: 0.75,
      emotion: 'NEUTRAL',
      novelty: 10,
      topicTags: [],
      isContinuation: false,
      analyzedAt: new Date(),
    };

    const decision = router.route(attention, 'what is 12 * 7?');

    expect(decision.executionPath).toBe('IMMEDIATE');
    expect(decision.retrieveMemory).toBe(false);
    expect(decision.reason).toBe(false);
    expect(decision.plan).toBe(false);
  });

  it('keeps technical questions on the reasoning path', () => {
    const attention: AttentionResult = {
      importance: 70,
      urgency: 10,
      intent: 'QUESTION',
      intentConfidence: 0.8,
      emotion: 'NEUTRAL',
      novelty: 10,
      topicTags: ['typescript', 'error'],
      isContinuation: false,
      analyzedAt: new Date(),
    };

    const decision = router.route(attention);

    expect(decision.executionPath).toBe('REASONING');
    expect(decision.retrieveMemory).toBe(true);
    expect(decision.reason).toBe(true);
  });

  it('routes plain code-writing commands without pulling memory', () => {
    const attention: AttentionResult = {
      importance: 65,
      urgency: 10,
      intent: 'COMMAND',
      intentConfidence: 0.85,
      emotion: 'NEUTRAL',
      novelty: 10,
      topicTags: ['calculator'],
      isContinuation: false,
      analyzedAt: new Date(),
    };

    const decision = router.route(attention, 'write me a calculator script');

    expect(decision.executionPath).toBe('PLANNING');
    expect(decision.retrieveMemory).toBe(false);
  });


  it('routes TECHNICAL debugging questions to REASONING even at importance 56', () => {
    const attention: AttentionResult = {
      importance: 56,
      urgency: 10,
      intent: 'TECHNICAL',
      intentConfidence: 0.8,
      emotion: 'NEUTRAL',
      novelty: 10,
      topicTags: ['typescript', 'error'],
      isContinuation: false,
      analyzedAt: new Date(),
    };

    const decision = router.route(
      attention,
      'why does this typescript function throw an error',
    );

    expect(decision.executionPath).toBe('REASONING');
    expect(decision.retrieveMemory).toBe(true);
    expect(decision.reason).toBe(true);
    expect(decision.plan).toBe(false);
    expect(decision.useTool).toBe(false);
  });

  it('routes a generic low-importance QUESTION to memory retrieval, unaffected by the TECHNICAL split', () => {
    const attention: AttentionResult = {
      importance: 38,
      urgency: 10,
      intent: 'QUESTION',
      intentConfidence: 0.75,
      emotion: 'NEUTRAL',
      novelty: 10,
      topicTags: ['docker', 'networking'],
      isContinuation: false,
      analyzedAt: new Date(),
    };

    const decision = router.route(attention, 'how does docker networking work');

    expect(decision.executionPath).toBe('MEMORY_RETRIEVAL');
    expect(decision.retrieveMemory).toBe(true);
    expect(decision.reason).toBe(false);
  });

  it('routes a normal-importance code-generation request to PLANNING', () => {
    const attention: AttentionResult = {
      importance: 55,
      urgency: 10,
      intent: 'TECHNICAL',
      intentConfidence: 0.85,
      emotion: 'NEUTRAL',
      novelty: 10,
      topicTags: ['api', 'endpoint'],
      isContinuation: false,
      analyzedAt: new Date(),
    };

    const decision = router.route(attention, 'create a typescript api endpoint');

    expect(decision.executionPath).toBe('PLANNING');
    expect(decision.retrieveMemory).toBe(false);
    expect(decision.reason).toBe(true);
    expect(decision.plan).toBe(true);
    expect(decision.useTool).toBe(true);
  });

  it('routes a HIGH-importance code-generation request to PLANNING, not REASONING (regression: ordering)', () => {
    const attention: AttentionResult = {
      importance: 75,
      urgency: 10,
      intent: 'TECHNICAL',
      intentConfidence: 0.9,
      emotion: 'NEUTRAL',
      novelty: 10,
      topicTags: ['api', 'endpoint', 'code'],
      isContinuation: false,
      analyzedAt: new Date(),
    };

    const decision = router.route(attention, 'create a typescript api endpoint');

    expect(decision.executionPath).toBe('PLANNING');
    expect(decision.retrieveMemory).toBe(false);
    expect(decision.plan).toBe(true);
  });

  it('routes a HIGH-importance technical problem (no code-gen verb) to REASONING', () => {
    const attention: AttentionResult = {
      importance: 75,
      urgency: 10,
      intent: 'TECHNICAL',
      intentConfidence: 0.9,
      emotion: 'NEUTRAL',
      novelty: 10,
      topicTags: ['typescript', 'error'],
      isContinuation: false,
      analyzedAt: new Date(),
    };

    const decision = router.route(
      attention,
      'why does this typescript function throw an error',
    );

    expect(decision.executionPath).toBe('REASONING');
    expect(decision.retrieveMemory).toBe(true);
    expect(decision.reason).toBe(true);
    expect(decision.plan).toBe(false);
  });
});
