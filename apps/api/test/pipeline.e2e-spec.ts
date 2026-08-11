import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { ExecutionOrchestratorService } from '../src/modules/runtime/services/execution-orchestrator.service';
import {
  TaskExecution,
  TaskExecutionStatus,
} from '../src/modules/runtime/contracts/execution.dto';

import { DatabaseService } from '../src/database/database.service';
import { users } from '@jarvis/database';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

describe('End-to-End Execution Pipeline (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication<App>;
  let workerProcess: ChildProcess;
  let orchestrator: ExecutionOrchestratorService;

  let db: DatabaseService;
  let testUserId: string;
  let workspaceRoot: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Start Nest HTTP server on a specific port for the worker to connect to
    await app.listen(4001);

    orchestrator = app.get(ExecutionOrchestratorService);

    db = app.get(DatabaseService);

    testUserId = randomUUID();
    await db.db.insert(users).values({
      id: testUserId,
      email: `${testUserId}@example.com`,
      passwordHash: 'dummy',
      role: 'USER',
    });

    // Create an isolated workspace for this test run
    workspaceRoot = path.join(process.cwd(), 'tmp', 'e2e', randomUUID());
    mkdirSync(workspaceRoot, {
      recursive: true,
    });

    // Spawn the worker node process
    const workerPath = path.resolve(
      __dirname,
      '../../worker-node/dist/main.js',
    );
    workerProcess = spawn('node', [workerPath], {
      env: {
        ...process.env,
        CORE_SERVER_URL: 'ws://localhost:4001/cluster',
        WORKSPACE_ROOT: workspaceRoot,
      },
      stdio: 'pipe',
    });

    workerProcess.stdout?.on('data', (data) =>
      console.log(`Worker stdout: ${data}`),
    );
    workerProcess.stderr?.on('data', (data) =>
      console.error(`Worker stderr: ${data}`),
    );

    // Wait 3 seconds for the worker to fully register and propagate via events
    await new Promise((resolve) => setTimeout(resolve, 3000));
  });

  afterAll(async () => {
    if (workerProcess) {
      // Wait for the child to fully exit so its piped stdio streams close
      await new Promise<void>((resolve) => {
        workerProcess.once('exit', () => resolve());
        workerProcess.kill('SIGTERM');
        // Safety timeout in case the signal is ignored
        setTimeout(() => {
          workerProcess.kill('SIGKILL');
          resolve();
        }, 3000).unref();
      });
    }

    if (db) {
      await db.db.delete(users).where(eq(users.id, testUserId));
    }

    await app.close();

    // Clean up the isolated workspace after the test completes
    if (workspaceRoot) {
      rmSync(workspaceRoot, {
        recursive: true,
        force: true,
      });
    }
  });

  it('should successfully execute system.info on the worker', async () => {
    // We submit a task directly to the orchestrator to verify the dispatch -> worker -> result pipeline
    const task = await orchestrator.submitTask(
      testUserId,
      'system.info',
      {},
      10000,
      0,
    );

    expect(task.id).toBeDefined();

    // Poll for completion
    let completedTask: TaskExecution | null = null;
    for (let i = 0; i < 20; i++) {
      completedTask = await orchestrator.getExecution(task.id);
      if (
        completedTask?.status === TaskExecutionStatus.SUCCESS ||
        completedTask?.status === TaskExecutionStatus.FAILED
      ) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    expect(completedTask).toBeDefined();
    expect(completedTask?.status).toBe(TaskExecutionStatus.SUCCESS);
    expect(completedTask?.output).toBeDefined();
    const output = completedTask?.output as
      { system?: { platform?: string; arch?: string } } | undefined;
    console.log('system.info output:', JSON.stringify(output, null, 2));
    expect(output?.system?.platform).toBeDefined();
    expect(output?.system?.arch).toBeDefined();
  }, 15000);

  it('should successfully execute filesystem.read on the worker', async () => {
    // FIX: Seed the sandbox with the file the worker expects to find
    writeFileSync(
      path.join(workspaceRoot, 'package.json'),
      JSON.stringify({ name: 'api', description: 'test sandbox' }),
    );

    const task = await orchestrator.submitTask(
      testUserId,
      'filesystem.read',
      { path: 'package.json' },
      10000,
      0,
    );

    // Poll for completion
    let completedTask: TaskExecution | null = null;
    for (let i = 0; i < 20; i++) {
      completedTask = await orchestrator.getExecution(task.id);
      if (
        completedTask?.status === TaskExecutionStatus.SUCCESS ||
        completedTask?.status === TaskExecutionStatus.FAILED
      ) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    expect(completedTask?.status).toBe(TaskExecutionStatus.SUCCESS);
    const output = completedTask?.output as { content?: string } | undefined;
    expect(output?.content).toBeDefined();
    console.log('filesystem.read output:', JSON.stringify(output, null, 2));
    expect(output?.content).toContain('api');
  }, 15000);
});
