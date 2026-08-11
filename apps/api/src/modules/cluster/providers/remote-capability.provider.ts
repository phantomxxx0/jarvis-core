import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CapabilityProvider } from '../../execution/contracts/capability-provider.interface';
import { ProviderType } from '../../execution/contracts/provider-type.enum';
import { ProviderHealth } from '../../execution/contracts/provider-health.enum';
import { ProviderMetadata } from '../../execution/contracts/provider-metadata.interface';
import { CapabilityDefinition } from '../../execution/contracts/capability-definition.interface';
import { WorkerTransportGateway } from '../interfaces/worker-transport-gateway.interface';
import {
  TaskEnvelope,
  ResultEnvelope,
} from '../contracts/execution/envelopes.interface';
import { randomUUID } from 'crypto';

export class RemoteCapabilityProvider implements CapabilityProvider {
  private readonly logger = new Logger(RemoteCapabilityProvider.name);

  public readonly type = ProviderType.REMOTE;

  constructor(
    public readonly id: string, // maps to nodeId
    private readonly gateway: WorkerTransportGateway,
    private readonly eventEmitter: EventEmitter2,
    private readonly knownCapabilities: CapabilityDefinition[],
  ) {}

  async initialize(): Promise<void> {
    this.logger.log(`Initialized RemoteCapabilityProvider for node ${this.id}`);
    await Promise.resolve();
  }

  async health(): Promise<ProviderHealth> {
    await Promise.resolve();
    return ProviderHealth.READY;
  }

  async metadata(): Promise<ProviderMetadata> {
    await Promise.resolve();
    return {
      nodeId: this.id,
      platform: 'remote',
      lastHeartbeat: new Date(),
    };
  }

  async capabilities(): Promise<CapabilityDefinition[]> {
    await Promise.resolve();
    return this.knownCapabilities;
  }

  async execute<TArgs = unknown, TResult = unknown>(
    capabilityId: string,
    args: TArgs,
  ): Promise<TResult> {
    const correlationId = randomUUID();
    const taskId = randomUUID();
    const traceId = randomUUID();
    const executionId = randomUUID();

    const envelope: TaskEnvelope = {
      taskId,
      capabilityId,
      payload: args as Record<string, unknown>,
      traceId,
      executionId,
      correlationId,
    };

    return new Promise((resolve, reject) => {
      // Subscribe to local event bus for the result
      const eventName = `task.result.${correlationId}`;
      const timeout = setTimeout(() => {
        this.eventEmitter.removeAllListeners(eventName);
        reject(new Error(`Remote task execution timed out for task ${taskId}`));
      }, 30000); // 30s timeout

      this.eventEmitter.once(eventName, (result: ResultEnvelope) => {
        clearTimeout(timeout);
        if (result.status === 'SUCCESS') {
          resolve(result.result as TResult);
        } else {
          reject(new Error(result.error || 'Remote task failed'));
        }
      });

      // Dispatch task over WebSocket
      this.gateway.dispatchTask(this.id, envelope).catch((err) => {
        clearTimeout(timeout);
        this.eventEmitter.removeAllListeners(eventName);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
  }

  async shutdown(): Promise<void> {
    this.logger.log(
      `Shutting down RemoteCapabilityProvider for node ${this.id}`,
    );
    await Promise.resolve();
  }
}
