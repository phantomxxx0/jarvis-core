import { Test, TestingModule } from '@nestjs/testing';
import { BrainModule } from './brain.module';
import { BrainService } from './brain.service';
import { PlannerService } from './planner/planner.service';
import { ExecutionRunnerService } from './task-engine/execution-runner.service';
import { InferenceService } from '../workers/inference/services/inference.service';

import { TaskEngineService } from './task-engine/task-engine.service';
import { ValidatedBrainPlan } from './reasoner/reasoner.service';

const mockInferenceWorker = {
  chat: jest.fn().mockResolvedValue({
    message: {
      content: JSON.stringify({
        steps: [
          {
            id: '1',
            action: 'read_project_file',
            arguments: { filePath: 'README.md' },
            dependencies: [],
          },
          {
            id: '2',
            action: 'execute_sql',
            arguments: { query: 'SELECT 1' },
            dependencies: ['1'],
          },
        ],
      }),
    },
  }),
  execute: jest.fn(),
};

describe('Phase 3.9 End-to-End Cognitive Pipeline Integration', () => {
  let moduleRef: TestingModule;
  let brainService: BrainService;
  let plannerService: PlannerService;
  let runnerService: ExecutionRunnerService;

  let taskEngine: TaskEngineService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [BrainModule],
    })
      .overrideProvider(InferenceService)
      .useValue(mockInferenceWorker)
      .compile();

    brainService = moduleRef.get(BrainService);
    plannerService = moduleRef.get(PlannerService);
    runnerService = moduleRef.get(ExecutionRunnerService);
    taskEngine = moduleRef.get(TaskEngineService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('verifies complete lifecycle and trace generation for prompt', async () => {
    const trace = (await brainService.processIntent(
      'Read README.md and summarize the project.',
      'Test context',
    )) as {
      traceId: string;
      brainPlan: { hasCycles: boolean; nodeCount: number };
      stages: { isParallel: boolean; stepIds: string[] }[];
      validatedBrainPlan: { isValid: boolean };
    };

    expect(trace).toBeDefined();
    expect(trace.traceId).toBeDefined();

    // DAG acyclic rule verification
    expect(trace.brainPlan.hasCycles).toBe(false);
    expect(trace.brainPlan.nodeCount).toBeGreaterThan(0);

    // Topological stage verification
    expect(trace.stages.length).toBeGreaterThan(0);
    expect(trace.validatedBrainPlan.isValid).toBe(true);
  });

  it('verifies parallel execution representation in topological stages', async () => {
    // If the mock returns steps without dependencies, they run parallel
    mockInferenceWorker.chat.mockResolvedValueOnce({
      message: {
        content: JSON.stringify({
          steps: [
            {
              id: '3',
              action: 'read_project_file',
              arguments: { filePath: 'README.md' },
              dependencies: [],
            },
            {
              id: '4',
              action: 'execute_sql',
              arguments: { query: 'SELECT 1' },
              dependencies: [],
            },
          ],
        }),
      },
    });

    const trace = (await brainService.processIntent(
      'Inspect project concurrently',
      'Test context',
    )) as {
      traceId: string;
      brainPlan: { hasCycles: boolean; nodeCount: number };
      stages: { isParallel: boolean; stepIds: string[] }[];
      validatedBrainPlan: { isValid: boolean };
    };

    const parallelStage = trace.stages.find((s) => s.isParallel);
    expect(parallelStage).toBeDefined();
    expect(parallelStage!.stepIds.length).toBeGreaterThan(1);
  });

  it('triggers self-healing path upon transient tool failure', async () => {
    // We expect it to try multiple times
    const failingStep = {
      id: '3',
      planId: 'mock_plan',
      name: 'failing_tool',
      action: 'failing_tool',
      capabilityRequired: 'failing_tool',
      arguments: {},
      dependencies: [],
      status: 'PENDING' as const,
    };

    const mockPlan: ValidatedBrainPlan = {
      id: 'mock_plan',
      goalId: 'mock_goal',
      goal: {
        id: 'g1',
        description: 'test',
        requestId: 'req1',
        intent: '',
        priority: 'NORMAL' as unknown as ValidatedBrainPlan['goal']['priority'],
        status: 'PLANNED' as unknown as ValidatedBrainPlan['goal']['status'],
        createdAt: new Date(),
      },
      status: 'VALIDATED',
      priority: 'NORMAL' as unknown as ValidatedBrainPlan['priority'],
      steps: [failingStep],
      createdAt: new Date(),
    };

    jest
      .spyOn(taskEngine, 'executePlan')
      .mockImplementation((plan: unknown) => {
        const p = plan as ValidatedBrainPlan;
        p.status = 'FAILED';
        p.steps[0].status = 'FAILED';
        p.steps[0].error = 'Mock Failure';
        return Promise.resolve();
      });

    jest
      .spyOn(plannerService, 'generateCorrectionArgs')
      .mockResolvedValue({ fixed: true });

    await runnerService.runWithSelfHealing(mockPlan, 2);

    expect(
      jest.spyOn(plannerService, 'generateCorrectionArgs'),
    ).toHaveBeenCalled();
  });
});
