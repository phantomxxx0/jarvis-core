import { Injectable, Logger } from '@nestjs/common';
import { IWorker } from '../interfaces/worker.interface';
import { Worker } from '../contracts/worker';
import { WorkerHealth } from '../contracts/worker-health';
import { WorkerResult } from '../contracts/worker-result';

import { WorkerKind } from '../enums/worker-kind.enum';
import { WorkerStatus } from '../enums/worker-status.enum';
import { EmbeddingService } from './services/embedding.service';
import { EmbeddingProviderType } from './enums/provider.enum';
import { EmbeddingWorkerPayload } from './contracts/embedding-worker-payload';

@Injectable()
export class EmbeddingWorker implements IWorker {
  private readonly logger = new Logger(EmbeddingWorker.name);
  private readonly workerId = 'embedding-worker';

  constructor(private readonly embeddingService: EmbeddingService) {}

  getInfo(): Worker {
    return {
      id: this.workerId,
      name: 'Primary Embedding Worker',
      kind: WorkerKind.EMBEDDING,
      status: WorkerStatus.IDLE,
      capabilities: [
        {
          id: 'embed',
          name: 'Text Embedding',
          kind: WorkerKind.EMBEDDING,
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
    this.logger.log('Embedding Worker started.');
    return Promise.resolve();
  }

  stop(): Promise<void> {
    this.logger.log('Embedding Worker stopped.');
    return Promise.resolve();
  }

  async execute<TPayload = EmbeddingWorkerPayload, TData = unknown>(
    payload: TPayload,
  ): Promise<WorkerResult<TData>> {
    const startTime = Date.now();
    const typedPayload = payload as unknown as EmbeddingWorkerPayload;

    if (!typedPayload || !typedPayload.input) {
      return {
        workerId: this.workerId,
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Execution payload must contain an input string.',
          timestamp: new Date(),
          workerId: this.workerId,
        },
        completedAt: new Date(),
        executionDurationMs: Date.now() - startTime,
      };
    }

    try {
      const response = await this.embeddingService.embed(
        EmbeddingProviderType.OLLAMA,
        {
          modelId:
            typedPayload.modelId ||
            process.env.OLLAMA_EMBED_MODEL ||
            'nomic-embed-text',
          input: typedPayload.input,
        },
      );

      return {
        workerId: this.workerId,
        success: response.success,
        data: response.embeddings as unknown as TData,
        completedAt: new Date(),
        executionDurationMs: Date.now() - startTime,
      };
    } catch (error: unknown) {
      this.logger.error('Embedding worker failed to execute', error);
      const err =
        typeof error === 'object' && error !== null
          ? (error as Record<string, unknown>)
          : {};
      return {
        workerId: this.workerId,
        success: false,
        error: {
          code:
            typeof err.code === 'string' ? err.code : 'EMBEDDING_WORKER_ERROR',
          message:
            typeof err.message === 'string'
              ? err.message
              : 'Embedding execution failed',
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
