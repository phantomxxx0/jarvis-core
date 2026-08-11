import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IObservationSynchronizer } from '../contracts/synchronizer.interface';
import { EventEnvelope } from '../contracts/event-envelope.interface';
import { ObservationQueueService } from '../services/observation-queue.service';

@Injectable()
export class KnowledgeSynchronizer
  implements IObservationSynchronizer, OnModuleInit
{
  private readonly logger = new Logger(KnowledgeSynchronizer.name);

  constructor(private readonly queueService: ObservationQueueService) {}

  onModuleInit() {
    this.queueService.registerSynchronizer(this);
  }

  getName(): string {
    return KnowledgeSynchronizer.name;
  }

  async synchronize(event: EventEnvelope): Promise<void> {
    this.logger.debug(
      `[KnowledgeSynchronizer] Checking observation ${event.id} for factual knowledge`,
    );
    // Route docs and RAG data to Knowledge space
    await Promise.resolve();
  }
}
