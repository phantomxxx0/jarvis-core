import * as os from 'os';
import systemInfoPlugin from '../../src/plugins/system-info';
import { WorkerContext } from '../../src/sdk/worker-capability';

describe('system.info capability', () => {
  it('should have correct metadata', () => {
    expect(systemInfoPlugin.id).toBe('system.info');
    expect(systemInfoPlugin.name).toBe('System Information');
    expect(systemInfoPlugin.category).toBe('system');
    expect(systemInfoPlugin.platform).toContain('all');
  });

  it('should have valid schemas', () => {
    expect(systemInfoPlugin.inputSchema).toBeDefined();
    expect(systemInfoPlugin.outputSchema).toBeDefined();
    // Quick structural check
    expect((systemInfoPlugin.outputSchema as any).properties.worker).toBeDefined();
    expect((systemInfoPlugin.outputSchema as any).properties.system).toBeDefined();
    expect((systemInfoPlugin.outputSchema as any).properties.cpu).toBeDefined();
  });

  it('should return system information properly mapped', async () => {
    const context: WorkerContext = {
      traceId: 't1',
      executionId: 'e1',
      correlationId: 'c1',
      workerId: 'test-worker-123',
    };

    const result = await systemInfoPlugin.execute({}, context) as any;

    expect(result).toBeDefined();
    
    // Check worker metadata
    expect(result.worker).toBeDefined();
    expect(result.worker.id).toBe('test-worker-123');
    expect(result.worker.hostname).toBe(os.hostname());
    expect(result.worker.startedAt).toBeDefined();
    expect(result.worker.version).toBe('1.0.0');

    // Check system metadata
    expect(result.system).toBeDefined();
    expect(result.system.platform).toBe(os.platform());
    expect(result.system.arch).toBe(os.arch());
    expect(result.system.release).toBe(os.release());
    expect(typeof result.system.uptimeSeconds).toBe('number');

    // Check CPU
    expect(result.cpu).toBeDefined();
    expect(typeof result.cpu.model).toBe('string');
    expect(typeof result.cpu.cores).toBe('number');
    expect(Array.isArray(result.cpu.loadAverage)).toBe(true);

    // Check Memory
    expect(result.memory).toBeDefined();
    expect(typeof result.memory.total).toBe('number');
    expect(typeof result.memory.free).toBe('number');
    expect(typeof result.memory.used).toBe('number');
    
    // Check Runtime
    expect(result.runtime).toBeDefined();
    expect(result.runtime.node).toBe(process.version);
    expect(typeof result.runtime.pid).toBe('number');

    // Check Network
    expect(result.network).toBeDefined();
    expect(Array.isArray(result.network.interfaces)).toBe(true);
  });
});
