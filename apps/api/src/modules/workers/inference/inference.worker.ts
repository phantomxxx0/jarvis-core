import { Injectable, Logger } from '@nestjs/common';
import { IWorker } from '../interfaces/worker.interface';
import { Worker } from '../contracts/worker';
import { WorkerHealth } from '../contracts/worker-health';
import { WorkerResult } from '../contracts/worker-result';

import { WorkerKind } from '../enums/worker-kind.enum';
import { WorkerStatus } from '../enums/worker-status.enum';
import { InferenceService } from './services/inference.service';
import { InferenceProviderType } from './enums/provider.enum';
import { InferenceWorkerPayload } from './contracts/inference-worker-payload';

@Injectable()
export class InferenceWorker implements IWorker {
  private readonly logger = new Logger(InferenceWorker.name);
  private readonly workerId = 'inference-worker';

  constructor(private readonly inferenceService: InferenceService) {}

  getInfo(): Worker {
    return {
      id: this.workerId,
      name: 'Primary Inference Worker',
      kind: WorkerKind.INFERENCE,
      status: WorkerStatus.IDLE,
      capabilities: [
        {
          id: 'chat',
          name: 'Chat Completion',
          kind: WorkerKind.INFERENCE,
          version: '1.0',
        },
      ],
      registeredAt: new Date(),
    };
  }

  getHealth(): Promise<WorkerHealth> {
    return Promise.resolve({
      workerId: this.workerId,
      status: WorkerStatus.IDLE,
      lastPingAt: new Date(),
      uptimeSeconds: process.uptime(),
      activeTasks: 0,
    });
  }

  start(): Promise<void> {
    this.logger.log('Inference Worker started.');
    return Promise.resolve();
  }

  stop(): Promise<void> {
    this.logger.log('Inference Worker stopped.');
    return Promise.resolve();
  }

  async execute<TPayload = InferenceWorkerPayload, TData = unknown>(
    payload: TPayload,
  ): Promise<WorkerResult<TData>> {
    const startTime = Date.now();
    const typedPayload = payload as unknown as InferenceWorkerPayload;

    if (!typedPayload || !typedPayload.prompt) {
      return {
        workerId: this.workerId,
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Execution payload must contain a prompt string.',
          timestamp: new Date(),
          workerId: this.workerId,
        },
        completedAt: new Date(),
        executionDurationMs: Date.now() - startTime,
      };
    }

    try {
      const response = await this.inferenceService.infer(
        InferenceProviderType.OLLAMA,
        {
          modelId:
            typedPayload.modelId || process.env.OLLAMA_CHAT_MODEL || 'qwen3:8b',
          prompt: typedPayload.prompt,
        },
      );

      return {
        workerId: this.workerId,
        success: response.success,
        data: response.content as unknown as TData,
        completedAt: new Date(),
        executionDurationMs: Date.now() - startTime,
      };
    } catch (error: unknown) {
      this.logger.error('Inference worker failed to execute', error);
      const err =
        typeof error === 'object' && error !== null
          ? (error as Record<string, unknown>)
          : {};
      return {
        workerId: this.workerId,
        success: false,
        error: {
          code:
            typeof err.code === 'string' ? err.code : 'INFERENCE_WORKER_ERROR',
          message:
            typeof err.message === 'string'
              ? err.message
              : 'Inference execution failed',
          timestamp: new Date(),
          workerId: this.workerId,
          details: err.details as Record<string, unknown> | undefined,
        },
        completedAt: new Date(),
        executionDurationMs: Date.now() - startTime,
      };
    }
  }

  cancel(executionId: string): Promise<void> {
    this.logger.log(
      `Cancellation requested for execution ${executionId} (placeholder)`,
    );
    return Promise.resolve();
  }
}
