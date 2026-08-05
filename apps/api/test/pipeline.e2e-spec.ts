import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import { ExecutionOrchestratorService } from '../src/modules/runtime/services/execution-orchestrator.service';
import { CapabilityRegistryService } from '../src/modules/runtime/services/capability-registry.service';
import { DatabaseService } from '../src/database/database.service';
import { users } from '@jarvis/database';
import { randomUUID } from 'crypto';

describe('End-to-End Execution Pipeline (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication<App>;
  let workerProcess: ChildProcess;
  let orchestrator: ExecutionOrchestratorService;
  let capabilityRegistry: CapabilityRegistryService;
  let db: DatabaseService;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    // Start Nest HTTP server on a specific port for the worker to connect to
    await app.listen(4001);

    orchestrator = app.get(ExecutionOrchestratorService);
    capabilityRegistry = app.get(CapabilityRegistryService);
    db = app.get(DatabaseService);

    testUserId = randomUUID();
    await db.db.insert(users).values({
      id: testUserId,
      email: `${testUserId}@example.com`,
      passwordHash: 'dummy',
      role: 'USER'
    });

    // Spawn the worker node process
    const workerPath = path.resolve(__dirname, '../../worker-node/dist/main.js');
    workerProcess = spawn('node', [workerPath], {
      env: {
        ...process.env,
        CORE_SERVER_URL: 'ws://localhost:4001/cluster',
      },
      stdio: 'pipe'
    });

    workerProcess.stdout?.on('data', (data) => console.log(`Worker stdout: ${data}`));
    workerProcess.stderr?.on('data', (data) => console.error(`Worker stderr: ${data}`));

    // Wait 3 seconds for the worker to fully register and propagate via events
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  afterAll(async () => {
    if (workerProcess) {
      workerProcess.kill('SIGTERM');
    }
    await app.close();
  });

  it('should successfully execute system.info on the worker', async () => {
    // We submit a task directly to the orchestrator to verify the dispatch -> worker -> result pipeline
    const task = await orchestrator.submitTask(
      testUserId,
      'system.info',
      {},
      10000,
      0
    );

    expect(task.id).toBeDefined();

    // Poll for completion
    let completedTask = null;
    for (let i = 0; i < 20; i++) {
      completedTask = await orchestrator.getExecution(task.id);
      if (completedTask?.status === 'SUCCESS' || completedTask?.status === 'FAILED') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    expect(completedTask).toBeDefined();
    expect(completedTask?.status).toBe('SUCCESS');
    expect(completedTask?.output).toBeDefined();
    console.log('system.info output:', JSON.stringify(completedTask?.output, null, 2));
    expect(completedTask?.output?.system?.platform).toBeDefined();
    expect(completedTask?.output?.system?.arch).toBeDefined();
  }, 15000);
  
  it('should successfully execute filesystem.read on the worker', async () => {
    const task = await orchestrator.submitTask(
      testUserId,
      'filesystem.read',
      { path: 'package.json' },
      10000,
      0
    );

    // Poll for completion
    let completedTask = null;
    for (let i = 0; i < 20; i++) {
      completedTask = await orchestrator.getExecution(task.id);
      if (completedTask?.status === 'SUCCESS' || completedTask?.status === 'FAILED') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    expect(completedTask?.status).toBe('SUCCESS');
    expect(completedTask?.output?.content).toBeDefined();
    console.log('filesystem.read output:', JSON.stringify(completedTask?.output, null, 2));
    expect(completedTask?.output?.content).toContain('api');
  }, 15000);
});
