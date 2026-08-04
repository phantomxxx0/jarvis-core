import { Injectable, Logger } from '@nestjs/common';
import { IWorkerRegistry } from '../interfaces/worker-registry.interface';
import { IWorker } from '../interfaces/worker.interface';
import { Worker } from '../contracts/worker';
import { WorkerKind } from '../enums/worker-kind.enum';
import { CapabilityRegistryService } from '../../registry/capability-registry.service';
import { CapabilityProvider } from '../../execution/contracts/capability-provider.interface';
import { ProviderType } from '../../execution/contracts/provider-type.enum';
import { ProviderHealth } from '../../execution/contracts/provider-health.enum';
import { WorkerStatus } from '../enums/worker-status.enum';

/**
 * Core registry managing the discovery and routing of tasks to specialized workers.
 */
@Injectable()
export class WorkerRegistryService implements IWorkerRegistry {
  private readonly logger = new Logger(WorkerRegistryService.name);
  private readonly workers = new Map<string, IWorker>();

  constructor(private readonly capabilityRegistry: CapabilityRegistryService) {}

  async register(worker: IWorker): Promise<void> {
    const info = worker.getInfo();
    if (this.workers.has(info.id)) {
      this.logger.warn(
        `Worker with ID ${info.id} is already registered. Overwriting.`,
      );
    }
    this.workers.set(info.id, worker);
    this.logger.log(
      `Registered worker: ${info.name} [${info.id}] (Kind: ${info.kind})`,
    );

    const provider = this.wrapWorkerAsProvider(worker);
    await this.capabilityRegistry.registerProvider(provider);
  }
  async unregister(workerId: string): Promise<void> {
    if (this.workers.has(workerId)) {
      this.workers.delete(workerId);
      this.logger.log(`Unregistered worker: [${workerId}]`);
      await this.capabilityRegistry.removeProvider(`worker-${workerId}`);
    }
  }
  getById(workerId: string): Promise<IWorker | undefined> {
    return Promise.resolve(this.workers.get(workerId));
  }
  discover(criteria: {
    kind?: WorkerKind;
    capabilityId?: string;
  }): Promise<ReadonlyArray<IWorker>> {
    const allWorkers = Array.from(this.workers.values());
    const filtered = allWorkers.filter((worker) => {
      const info = worker.getInfo();
      // Initially filtering by WorkerKind as requested.
      if (criteria.kind && info.kind !== criteria.kind) {
        return false;
      }
      return true;
    });
    return Promise.resolve(filtered);
  }
  listAll(): Promise<ReadonlyArray<Worker>> {
    return Promise.resolve(
      Array.from(this.workers.values()).map((worker) => worker.getInfo()),
    );
  }

  private wrapWorkerAsProvider(worker: IWorker): CapabilityProvider {
    const info = worker.getInfo();
    return {
      id: `worker-${info.id}`,
      type: ProviderType.WORKER,
      initialize: async () => {},
      health: async () => {
        try {
          const h = await worker.getHealth();
          return h.status === WorkerStatus.IDLE ||
            h.status === WorkerStatus.BUSY
            ? ProviderHealth.READY
            : ProviderHealth.UNHEALTHY;
        } catch {
          return ProviderHealth.UNKNOWN;
        }
      },
      metadata: async () => {
        await Promise.resolve();
        return {
          nodeId: 'local-worker',
          platform: 'nodejs',
          lastHeartbeat: new Date(),
        };
      },
      capabilities: async () => {
        await Promise.resolve();
        return info.capabilities.map((cap) => ({
          id: cap.id,
          version: '1.0.0',
          description: cap.description || cap.name || cap.id,
          risk: 'LOW',
          timeout: 30000,
          estimatedCost: 0,
          concurrencyLimit: 1,
          requiresApproval: false,
          supportsStreaming: false,
          supportsCancellation: true,
        }));
      },
      execute: async <TArgs = unknown, TResult = unknown>(
        capId: string,
        args: TArgs,
      ): Promise<TResult> => {
        const result = await worker.execute(args);
        if (!result.success) {
          throw new Error(result.error?.message || 'Worker execution failed');
        }
        return result.data as TResult;
      },
      shutdown: async () => worker.stop(),
    };
  }
}
