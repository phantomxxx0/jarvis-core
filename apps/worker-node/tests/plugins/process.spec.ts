import { processList } from '../../src/plugins/process-list';
import { processSpawn } from '../../src/plugins/process-spawn';
import { processWait } from '../../src/plugins/process-wait';
import { processKill } from '../../src/plugins/process-kill';
import { processManager } from '../../src/services/process-manager';

describe('Process Capabilities Plugins', () => {
  const dummyContext = { workerId: 'test-worker' };

  afterEach(() => {
    processManager.cleanupAll();
  });

  it('should spawn, list, wait, and kill processes', async () => {
    // 1. Spawn a process that just sleeps for 2 seconds
    const spawnRes = await processSpawn.execute({ command: 'sleep', args: ['2'] }, dummyContext) as any;
    expect(spawnRes.processId).toBeDefined();

    // 2. List processes and verify it's running
    const listRes = await processList.execute({}, dummyContext) as any;
    expect(listRes.processes.length).toBe(1);
    expect(listRes.processes[0].processId).toBe(spawnRes.processId);
    expect(listRes.processes[0].status).toBe('running');

    // 3. Kill the process
    const killRes = await processKill.execute({ processId: spawnRes.processId }, dummyContext) as any;
    expect(killRes.success).toBe(true);

    // 4. Wait for it (should return killed status quickly)
    const waitRes = await processWait.execute({ processId: spawnRes.processId }, dummyContext) as any;
    expect(waitRes.status).toBe('killed');
  });

  it('should wait for process completion', async () => {
    // 1. Spawn a fast process
    const spawnRes = await processSpawn.execute({ command: 'echo', args: ['hello'] }, dummyContext) as any;
    expect(spawnRes.processId).toBeDefined();

    // 2. Wait for it to complete
    const waitRes = await processWait.execute({ processId: spawnRes.processId }, dummyContext) as any;
    expect(waitRes.status).toBe('completed');
    expect(waitRes.exitCode).toBe(0);
  });
});
