import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { ClusterManifest } from '../../cluster/contracts/cluster/cluster-manifest.interface';

export interface WorkerRecord {
  id: string;
  hostname: string;
  platform: string;
  arch: string;
  version: string;
  startedAt: string;
  status: 'ACTIVE' | 'OFFLINE';
  lastHeartbeat: Date;
  capabilityIds: string[];
}

export interface CapabilityRecord {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  platform: string[];
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  workerIds: Set<string>; // using Set for efficient uniqueness
}

const workerSchema = z.object({
  id: z.string(),
  hostname: z.string(),
  platform: z.string(),
  arch: z.string(),
  version: z.string(),
  startedAt: z.string(),
});

const capabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  category: z.string(),
  description: z.string(),
  platform: z.array(z.string()),
  inputSchema: z.record(z.string(), z.unknown()),
  outputSchema: z.record(z.string(), z.unknown()).optional(),
});

@Injectable()
export class CapabilityRegistryService {
  private readonly logger = new Logger(CapabilityRegistryService.name);

  private readonly workers = new Map<string, WorkerRecord>();
  private readonly capabilities = new Map<string, CapabilityRecord>();

  public registerWorker(manifest: ClusterManifest): void {
    if (!manifest.worker) {
      this.logger.debug(
        'Worker registration without worker manifest. Skipping capability indexing.',
      );
      return;
    }

    // Validation
    const workerValidation = workerSchema.safeParse(manifest.worker);
    if (!workerValidation.success) {
      this.logger.error(
        `Malformed worker manifest: ${workerValidation.error.message}`,
      );
      throw new Error('Malformed worker manifest');
    }

    const worker = workerValidation.data;

    // Disconnect old worker if it exists
    if (this.workers.has(worker.id)) {
      this.logger.log(
        `Worker ${worker.id} reconnecting. Cleaning up old state.`,
      );
      this.unregisterWorker(worker.id);
    }

    let capabilityIds: string[] = [];

    if (manifest.capabilities) {
      const capabilitiesValidation = z
        .array(capabilitySchema)
        .safeParse(manifest.capabilities);
      if (!capabilitiesValidation.success) {
        this.logger.error(
          `Malformed capabilities manifest: ${capabilitiesValidation.error.message}`,
        );
        throw new Error('Malformed capabilities manifest');
      }

      const caps = capabilitiesValidation.data;

      // Check for duplicate capability IDs within this worker
      const uniqueIds = new Set(caps.map((c) => c.id));
      if (uniqueIds.size !== caps.length) {
        throw new Error('Duplicate capability IDs within a single worker');
      }

      capabilityIds = caps.map((c) => c.id);

      // Register capabilities
      for (const cap of caps) {
        let existingCap = this.capabilities.get(cap.id);
        if (!existingCap) {
          existingCap = {
            ...cap,
            workerIds: new Set(),
          };
          this.capabilities.set(cap.id, existingCap);
        }
        existingCap.workerIds.add(worker.id);
      }
    }

    // Register worker
    this.workers.set(worker.id, {
      ...worker,
      status: 'ACTIVE',
      lastHeartbeat: new Date(),
      capabilityIds,
    });

    this.logger.log(
      `Registered worker ${worker.id} with ${capabilityIds.length} capabilities`,
    );
  }

  public unregisterWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (!worker) {
      return;
    }

    for (const capId of worker.capabilityIds) {
      const cap = this.capabilities.get(capId);
      if (cap) {
        cap.workerIds.delete(workerId);
        // Clean up capability if no workers provide it anymore
        if (cap.workerIds.size === 0) {
          this.capabilities.delete(capId);
        }
      }
    }

    this.workers.delete(workerId);
    this.logger.log(
      `Unregistered worker ${workerId} and released capability indexes`,
    );
  }

  public updateHeartbeat(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.lastHeartbeat = new Date();
      worker.status = 'ACTIVE';
    }
  }

  public getWorker(workerId: string): WorkerRecord | undefined {
    return this.workers.get(workerId);
  }

  public getCapability(
    capabilityId: string,
  ):
    | (Omit<CapabilityRecord, 'workerIds'> & { workerIds: string[] })
    | undefined {
    const cap = this.capabilities.get(capabilityId);
    if (!cap) return undefined;
    return {
      ...cap,
      workerIds: Array.from(cap.workerIds),
    };
  }

  public listWorkers(): WorkerRecord[] {
    return Array.from(this.workers.values());
  }

  public listCapabilities(): (Omit<CapabilityRecord, 'workerIds'> & {
    workerIds: string[];
  })[] {
    return Array.from(this.capabilities.values()).map((cap) => ({
      ...cap,
      workerIds: Array.from(cap.workerIds),
    }));
  }
}
