import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import { WorkflowEngineService } from '../src/modules/runtime/services/workflow-engine.service';
import { WorkflowPlannerService } from '../src/modules/runtime/services/workflow-planner.service';
import { CapabilityRegistryService } from '../src/modules/registry/capability-registry.service';
import { InferenceService } from '../src/modules/workers/inference/services/inference.service';
import { DatabaseService } from '../src/database/database.service';
import { users, workflowExecutions } from '@jarvis/database';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { WorkflowExecutionStatus } from '../src/modules/runtime/contracts/workflow.dto';

describe('End-to-End Smoke Test Pipeline (e2e)', () => {
  jest.setTimeout(45000); // 45s timeout to let all tasks run

  let app: INestApplication;
  let workerProcess: ChildProcess;
  let workflowEngine: WorkflowEngineService;
  let workflowPlanner: WorkflowPlannerService;
  let inferenceService: InferenceService;
  let db: DatabaseService;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    // Start Nest HTTP server on a specific port for the worker to connect to
    await app.listen(4002); // 4002 to avoid conflicts if another runs on 4001

    workflowEngine = app.get(WorkflowEngineService);
    workflowPlanner = app.get(WorkflowPlannerService);
    inferenceService = app.get(InferenceService);
    db = app.get(DatabaseService);

    testUserId = randomUUID();
    await db.db.insert(users).values({
      id: testUserId,
      email: `${testUserId}@smoke.com`,
      passwordHash: 'dummy',
      role: 'USER'
    });

    // Spawn the worker node process
    const workerPath = path.resolve(__dirname, '../../worker-node/dist/main.js');
    workerProcess = spawn('node', [workerPath], {
      env: {
        ...process.env,
        CORE_SERVER_URL: 'ws://localhost:4002/cluster',
      },
      stdio: 'pipe'
    });

    workerProcess.stdout?.on('data', (data) => console.log(`Worker stdout: ${data}`));
    workerProcess.stderr?.on('data', (data) => console.error(`Worker stderr: ${data}`));

    // Wait for the worker to fully register and capabilities to load
    for (let i = 0; i < 30; i++) {
      const registry = app.get(CapabilityRegistryService);
      const caps = registry.getAllDefinitions();
      if (caps.find(c => c.id === 'system.info') && caps.find(c => c.id === 'process.spawn')) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  afterAll(async () => {
    if (workerProcess) {
      workerProcess.kill('SIGTERM');
    }
    // Delete test user to clean up DB
    await db.db.delete(users).where(eq(users.id, testUserId));
    await app.close();
  });

  it('should successfully plan and execute a complete workflow', async () => {
    // 1. Mock the InferenceService to return a predetermined workflow plan JSON
    const mockWorkflowJson = JSON.stringify({
      steps: [
        {
          id: 'step_info',
          capabilityId: 'system.info',
          input: {},
          dependencies: []
        },
        {
          id: 'step_write',
          capabilityId: 'filesystem.write',
          input: {
            path: 'smoke-test-file.txt',
            content: 'hello from workflow',
            overwrite: true
          },
          dependencies: []
        },
        {
          id: 'step_read',
          capabilityId: 'filesystem.read',
          input: {
            path: 'smoke-test-file.txt'
          },
          dependencies: ['step_write']
        },
        {
          id: 'step_git',
          capabilityId: 'git.status',
          input: {
            cwd: '.'
          },
          dependencies: []
        },
        {
          id: 'step_http',
          capabilityId: 'http.get',
          input: {
            url: 'https://example.com'
          },
          dependencies: []
        },
        {
          id: 'step_spawn',
          capabilityId: 'process.spawn',
          input: {
            command: 'echo',
            args: ['hello world']
          },
          dependencies: []
        },
        {
          id: 'step_wait',
          capabilityId: 'process.wait',
          input: {
            processId: '${step_spawn.output.processId}'
          },
          dependencies: ['step_spawn']
        }
      ]
    });

    (workflowPlanner as any).invokeLLM = jest.fn().mockResolvedValue(mockWorkflowJson);
    // 2. Plan the workflow
    const goal = "Perform a smoke test with system.info, files, git, http, and processes";
    const definition = await workflowPlanner.plan(goal);

    expect(definition.steps).toHaveLength(7);
    expect(definition.planningMetadata?.validationResult).toBe('SUCCESS');

    // 3. Submit workflow to engine
    const executionDto = await workflowEngine.submitWorkflow(testUserId, definition, 'Smoke Test Workflow');

    // 4. Wait for workflow to finish
    let isComplete = false;
    let finalStatus: WorkflowExecutionStatus = WorkflowExecutionStatus.PENDING;
    let finalState: any = {};
    
    for (let i = 0; i < 60; i++) {
      const [record] = await db.db.select().from(workflowExecutions).where(eq(workflowExecutions.id, executionDto.id));
      if (record && (record.status === WorkflowExecutionStatus.SUCCESS || record.status === WorkflowExecutionStatus.FAILED)) {
        isComplete = true;
        finalStatus = record.status as WorkflowExecutionStatus;
        finalState = record.state;
        break;
      }
      await new Promise(res => setTimeout(res, 500));
    }

    expect(isComplete).toBe(true);
    if (finalStatus !== WorkflowExecutionStatus.SUCCESS) {
      console.log('Workflow failed! Final state:', JSON.stringify(finalState, null, 2));
    }
    expect(finalStatus).toBe(WorkflowExecutionStatus.SUCCESS);
    
    // Assert all steps reached SUCCESS
    expect(finalState['step_info'].status).toBe('SUCCESS');
    expect(finalState['step_write'].status).toBe('SUCCESS');
    expect(finalState['step_read'].status).toBe('SUCCESS');
    expect(finalState['step_git'].status).toBe('SUCCESS');
    expect(finalState['step_http'].status).toBe('SUCCESS');
    expect(finalState['step_spawn'].status).toBe('SUCCESS');
    expect(finalState['step_wait'].status).toBe('SUCCESS');
    
    // Validate variable propagation
    expect(finalState['step_wait'].output?.exitCode).toBe(0);
  });
});
