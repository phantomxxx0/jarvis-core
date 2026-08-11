import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionEngine } from './execution-engine';
import { MemoryGateway } from '../memory/memory-gateway';
import { ReasoningGateway } from '../reasoning/reasoning.service';
import { PlanningGateway } from '../planning/planning.service';
import { ToolRouter } from '../skills/tool-router';
import { WorkingMemoryService } from '../working-memory/working-memory.service';
import { LatencyTracker } from '../metrics/latency';
import type { ExecutiveDecision } from '../contracts/executive-decision';
import type { CognitiveContext } from '../contracts/cognitive-context';
import type { WorkingMemoryState } from '../contracts/working-memory';
import type { SkillResult } from '../skills/skill-router';
import type { PlanningResultV2, PlanStepV2 } from '../contracts/planning-result';

/**
 * execution-engine.spec.ts
 *
 * Stage 8F — V2 Tool Boundary Validation.
 *
 * Covers ExecutionEngine.executePlanSteps()'s behavior when a plan
 * contains a 'skill' step: does it call ToolRouter with the right
 * arguments, and — critically — what does it do with a SkillResult
 * whose success is false? This suite intentionally does NOT fix any
 * bug it finds; it characterizes current behavior only.
 */

function makeDecision(overrides: Partial<ExecutiveDecision> = {}): ExecutiveDecision {
  return {
    executionPath: 'PLANNING',
    retrieveMemory: false,
    reason: false,
    plan: true,
    useTool: true,
    rationale: 'test',
    confidence: 0.9,
    respondImmediately: false,
    runReflectionAsync: false,
    runLearningAsync: true,
    latencyBudgetMs: 2000,
    decidedAt: new Date(),
    ...overrides,
  };
}

function makeState(): WorkingMemoryState {
  return {
    userId: 'user-1',
    sessionId: 'session-1',
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
  } as WorkingMemoryState;
}

function makeContext(): CognitiveContext {
  return {
    perceptionResult: {
      sessionId: 'session-1',
      userId: 'user-1',
      normalizedInput: 'test goal',
      modality: 'text',
      languageCode: 'en',
      estimatedTokens: 5,
      wasTruncated: false,
      codeBlocks: [],
      attachmentRefs: [],
      timestamp: new Date(),
      perceivedAt: new Date(),
    },
    attentionResult: {
      importance: 60,
      urgency: 10,
      intent: 'COMMAND',
      intentConfidence: 0.8,
      emotion: 'NEUTRAL',
      novelty: 10,
      topicTags: [],
      isContinuation: false,
      analyzedAt: new Date(),
    },
    executionContext: {
      principal: {
        id: 'principal-1',
        principalType: 'USER',
        role: 'ADMIN',
        permissions: [],
        sessionId: 'session-1',
        authenticationMethod: 'JWT',
        authenticatedAt: new Date(),
      },
      requestId: 'req-1',
      traceId: 'trace-1',
      createdAt: new Date(),
    },
  } as unknown as CognitiveContext;
}

function makePlan(steps: PlanStepV2[]): PlanningResultV2 {
  return {
    id: 'plan-1',
    goalId: 'goal-1',
    goalDescription: 'test goal',
    steps,
    estimatedRisk: 'LOW',
    requiresApproval: false,
    plannedAt: new Date(),
  };
}

function makeSkillStep(overrides: Partial<PlanStepV2> = {}): PlanStepV2 {
  return {
    id: 'step-1',
    name: 'invoke shell',
    description: 'test skill step',
    type: 'skill',
    skillName: 'shell',
    input: { command: 'echo hi' },
    dependsOn: [],
    optional: false,
    ...overrides,
  };
}

describe('ExecutionEngine.executePlanSteps() — Stage 8F tool boundary', () => {
  let engine: ExecutionEngine;
  let toolRouter: { invoke: jest.Mock };
  let workingMemory: { setToolOutput: jest.Mock };
  let planningGateway: { plan: jest.Mock };
  let latency: LatencyTracker;

  beforeEach(async () => {
    toolRouter = { invoke: jest.fn() };
    workingMemory = { setToolOutput: jest.fn() };
    planningGateway = { plan: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionEngine,
        { provide: MemoryGateway, useValue: { retrieve: jest.fn() } },
        { provide: ReasoningGateway, useValue: { reason: jest.fn() } },
        { provide: PlanningGateway, useValue: planningGateway },
        { provide: ToolRouter, useValue: toolRouter },
        { provide: WorkingMemoryService, useValue: workingMemory },
      ],
    }).compile();

    engine = module.get<ExecutionEngine>(ExecutionEngine);
    latency = new LatencyTracker();
  });

  it('invokes ToolRouter with the skill step\'s skillName, input, and the CognitiveContext.executionContext', async () => {
    const state = makeState();
    const context = makeContext();
    const step = makeSkillStep();
    planningGateway.plan.mockResolvedValue(makePlan([step]));
    toolRouter.invoke.mockResolvedValue({
      skillName: 'shell',
      success: true,
      output: { stdout: 'hi', stderr: '', exitCode: 0 },
      executionMs: 5,
    } satisfies SkillResult);

    await engine.execute(makeDecision(), context, state, latency);

    expect(toolRouter.invoke).toHaveBeenCalledTimes(1);
    expect(toolRouter.invoke).toHaveBeenCalledWith(
      'shell',
      { command: 'echo hi' },
      context.executionContext,
    );
  });

  it('stores result.output in working memory when SkillResult.success is true', async () => {
    const state = makeState();
    const context = makeContext();
    const step = makeSkillStep();
    planningGateway.plan.mockResolvedValue(makePlan([step]));
    const successOutput = { stdout: 'hi', stderr: '', exitCode: 0 };
    toolRouter.invoke.mockResolvedValue({
      skillName: 'shell',
      success: true,
      output: successOutput,
      executionMs: 5,
    } satisfies SkillResult);

    await engine.execute(makeDecision(), context, state, latency);

    expect(workingMemory.setToolOutput).toHaveBeenCalledWith(
      state,
      'shell',
      successOutput,
    );
  });

  it('CHARACTERIZATION (not a fix): when SkillResult.success is false, ' +
    'ExecutionEngine still calls setToolOutput() with result.output (null), ' +
    'with no check of result.success and no propagation of result.error', async () => {
    const state = makeState();
    const context = makeContext();
    const step = makeSkillStep();
    planningGateway.plan.mockResolvedValue(makePlan([step]));
    toolRouter.invoke.mockResolvedValue({
      skillName: 'shell',
      success: false,
      output: null,
      error: "Permission denied: 'shell' requires EXECUTE_SHELL.",
      executionMs: 2,
    } satisfies SkillResult);

    await engine.execute(makeDecision(), context, state, latency);

    // This assertion documents CURRENT behavior, which is the bug:
    // setToolOutput is called unconditionally with the failed result's
    // (null) output, indistinguishable from a tool that legitimately
    // returned null. result.error is never read or stored anywhere.
    expect(workingMemory.setToolOutput).toHaveBeenCalledTimes(1);
    expect(workingMemory.setToolOutput).toHaveBeenCalledWith(
      state,
      'shell',
      null,
    );
  });

  it('does not call ToolRouter for a non-skill plan step', async () => {
    const state = makeState();
    const context = makeContext();
    const languageStep: PlanStepV2 = {
      id: 'step-2',
      name: 'direct_language_generation',
      description: 'no tool involved',
      type: 'language',
      input: { goal: 'test goal' },
      dependsOn: [],
      optional: false,
    };
    planningGateway.plan.mockResolvedValue(makePlan([languageStep]));

    await engine.execute(makeDecision(), context, state, latency);

    expect(toolRouter.invoke).not.toHaveBeenCalled();
    expect(workingMemory.setToolOutput).not.toHaveBeenCalled();
  });
});
