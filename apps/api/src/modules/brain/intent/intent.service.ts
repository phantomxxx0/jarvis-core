import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';

import { ContextPayload } from '../contracts/context-payload';
import { Intent } from '../contracts/intent';
import { BrainEvent } from '../events/enums/brain-event.enum';

import { WorkerRegistryService } from '../../workers/registry/worker-registry.service';
import { WorkerKind } from '../../workers/enums/worker-kind.enum';
import { InferenceWorkerPayload } from '../../workers/inference/contracts/inference-worker-payload';
import type { IWorker } from '../../workers/interfaces/worker.interface';

import { IntentPromptBuilder } from './intent.prompt-builder';
import { IntentParser } from './pipeline/intent.parser';
import { IntentValidator } from './pipeline/intent.validator';
import { IntentNormalizer } from './pipeline/intent.normalizer';
import { IntentClassification } from './pipeline/intent.classification';

@Injectable()
export class IntentService implements OnModuleInit {
  private readonly logger = new Logger(IntentService.name);

  /**
   * Resolved once during startup by onModuleInit().
   * Null before the module initialises or if no INFERENCE worker is registered.
   */
  private inferenceWorker: IWorker | null = null;

  constructor(
    private readonly workerRegistry: WorkerRegistryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    const workers = await this.workerRegistry.discover({
      kind: WorkerKind.INFERENCE,
    });

    if (workers.length === 0) {
      this.logger.warn(
        'No INFERENCE worker registered at startup — intent extraction will use fallback.',
      );
      return;
    }

    this.inferenceWorker = workers[0];
    this.logger.log(
      `IntentService cached worker: ${this.inferenceWorker.getInfo().name}`,
    );
  }

  async extractIntent(query: string, context: ContextPayload): Promise<Intent> {
    this.logger.log(`Extracting intent for query: "${query}"`);

    const classification = await this.runPipeline(query, context);
    const intent = this.toIntent(classification);

    this.eventEmitter.emit(BrainEvent.INTENT_DETECTED, { query, intent });
    this.logger.log(
      `Intent detected: type=${classification.type} confidence=${classification.confidence}`,
    );

    return intent;
  }

  // ---------------------------------------------------------------------------
  // Private helpers — pipeline execution
  // ---------------------------------------------------------------------------

  private async runPipeline(
    query: string,
    context: ContextPayload,
  ): Promise<IntentClassification> {
    try {
      if (this.inferenceWorker === null) {
        this.logger.warn(
          'No INFERENCE worker available — falling back to UNKNOWN intent.',
        );
        return IntentNormalizer.getFallbackIntent(query);
      }

      const inferenceWorker = this.inferenceWorker;
      const contextString = JSON.stringify(context);
      const prompt = IntentPromptBuilder.build(query, contextString);

      const result = await inferenceWorker.execute<
        InferenceWorkerPayload,
        string
      >({
        prompt,
      });

      if (!result.success || result.data == null) {
        this.logger.warn(
          `Inference worker returned no data — falling back to UNKNOWN intent.`,
        );
        return IntentNormalizer.getFallbackIntent(query);
      }

      const rawJson = IntentParser.parse(result.data);

      if (!IntentValidator.validate(rawJson)) {
        this.logger.warn(
          'Intent validation failed — falling back to UNKNOWN intent.',
        );
        return IntentNormalizer.getFallbackIntent(query);
      }

      return IntentNormalizer.normalize(rawJson);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Pipeline error during intent extraction: ${msg} — falling back to UNKNOWN intent.`,
      );
      return IntentNormalizer.getFallbackIntent(query);
    }
  }

  /**
   * Promotes the pipeline's IntentClassification to the canonical Intent by
   * assigning a unique id at the orchestration boundary.
   *
   * The id is intentionally NOT generated inside the stateless pipeline.
   * All classification fields are forwarded unchanged.
   */
  private toIntent(c: IntentClassification): Intent {
    return {
      id: randomUUID(),
      version: c.version,
      type: c.type,
      confidence: c.confidence,
      entities: c.entities,
      goal: c.goal,
      constraints: c.constraints,
      requiresMemory: c.requiresMemory,
      requiresKnowledge: c.requiresKnowledge,
      requiresPlanning: c.requiresPlanning,
      requiresTools: c.requiresTools,
      capabilities: c.capabilities,
    };
  }
}
