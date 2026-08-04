import { Test, TestingModule } from '@nestjs/testing';
import { CapabilityRegistryService } from './capability-registry.service';
import { ClusterManifest } from '../../cluster/contracts/cluster/cluster-manifest.interface';

describe('CapabilityRegistryService', () => {
  let service: CapabilityRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CapabilityRegistryService],
    }).compile();

    service = module.get<CapabilityRegistryService>(CapabilityRegistryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const validWorkerManifest: ClusterManifest = {
    clusterVersion: '1.0',
    minimumWorkerVersion: '1.0',
    supportedProtocols: ['socket.io'],
    worker: {
      id: 'worker-1',
      hostname: 'test-host',
      platform: 'linux',
      arch: 'x64',
      version: '1.0.0',
      startedAt: new Date().toISOString(),
    },
    capabilities: [
      {
        id: 'system.info',
        name: 'System Info',
        version: '1.0.0',
        category: 'system',
        description: 'Get system info',
        platform: ['all'],
        inputSchema: {},
      },
    ],
  };

  describe('worker registration', () => {
    it('should register a worker and its capabilities', () => {
      service.registerWorker(validWorkerManifest);

      const worker = service.getWorker('worker-1');
      expect(worker).toBeDefined();
      expect(worker?.id).toBe('worker-1');
      expect(worker?.capabilityIds).toContain('system.info');

      const cap = service.getCapability('system.info');
      expect(cap).toBeDefined();
      expect(cap?.workerIds).toContain('worker-1');
    });

    it('should skip indexing if no worker manifest is provided (protocol compatibility)', () => {
      const emptyManifest: ClusterManifest = {
        clusterVersion: '1.0',
        minimumWorkerVersion: '1.0',
        supportedProtocols: ['socket.io'],
      };
      
      expect(() => service.registerWorker(emptyManifest)).not.toThrow();
      expect(service.listWorkers()).toHaveLength(0);
    });

    it('should throw on malformed worker schema', () => {
      const invalidManifest = {
        ...validWorkerManifest,
        worker: { id: 123 } as any, // invalid id type
      };

      expect(() => service.registerWorker(invalidManifest)).toThrow('Malformed worker manifest');
    });

    it('should reject duplicate capability IDs within a single worker', () => {
      const dupManifest = {
        ...validWorkerManifest,
        capabilities: [
          validWorkerManifest.capabilities![0],
          validWorkerManifest.capabilities![0],
        ],
      };

      expect(() => service.registerWorker(dupManifest)).toThrow('Duplicate capability IDs within a single worker');
    });

    it('should allow multiple workers to expose the same capability', () => {
      service.registerWorker(validWorkerManifest);
      
      const worker2Manifest = {
        ...validWorkerManifest,
        worker: {
          ...validWorkerManifest.worker!,
          id: 'worker-2',
        },
      };

      service.registerWorker(worker2Manifest);

      const workers = service.listWorkers();
      expect(workers).toHaveLength(2);

      const cap = service.getCapability('system.info');
      expect(cap?.workerIds).toHaveLength(2);
      expect(cap?.workerIds).toContain('worker-1');
      expect(cap?.workerIds).toContain('worker-2');
    });

    it('should cleanup old state on reconnect (same worker ID)', () => {
      service.registerWorker(validWorkerManifest);
      
      // Reconnect with same ID, different capabilities
      const reconnectManifest = {
        ...validWorkerManifest,
        capabilities: [],
      };

      service.registerWorker(reconnectManifest);

      const worker = service.getWorker('worker-1');
      expect(worker?.capabilityIds).toHaveLength(0);

      const cap = service.getCapability('system.info');
      expect(cap).toBeUndefined(); // Should be cleaned up because no workers have it
    });
  });

  describe('worker unregistration', () => {
    it('should remove worker and release capability indexes', () => {
      service.registerWorker(validWorkerManifest);
      
      service.unregisterWorker('worker-1');

      expect(service.getWorker('worker-1')).toBeUndefined();
      expect(service.getCapability('system.info')).toBeUndefined();
      expect(service.listWorkers()).toHaveLength(0);
      expect(service.listCapabilities()).toHaveLength(0);
    });

    it('should not delete capability if another worker still provides it', () => {
      service.registerWorker(validWorkerManifest);
      
      const worker2Manifest = {
        ...validWorkerManifest,
        worker: {
          ...validWorkerManifest.worker!,
          id: 'worker-2',
        },
      };

      service.registerWorker(worker2Manifest);
      service.unregisterWorker('worker-1');

      expect(service.getWorker('worker-1')).toBeUndefined();
      
      const cap = service.getCapability('system.info');
      expect(cap).toBeDefined();
      expect(cap?.workerIds).toContain('worker-2');
      expect(cap?.workerIds).not.toContain('worker-1');
    });
  });

  describe('heartbeat', () => {
    it('should update lastHeartbeat of a worker', () => {
      service.registerWorker(validWorkerManifest);
      const workerBefore = service.getWorker('worker-1');
      const timeBefore = workerBefore?.lastHeartbeat.getTime();

      // simulate time passing
      jest.useFakeTimers();
      jest.advanceTimersByTime(1000);

      service.updateHeartbeat('worker-1');

      const workerAfter = service.getWorker('worker-1');
      expect(workerAfter?.lastHeartbeat.getTime()).toBeGreaterThan(timeBefore!);

      jest.useRealTimers();
    });
  });
});
