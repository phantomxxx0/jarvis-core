import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IObservationSynchronizer } from '../contracts/synchronizer.interface';
import { EventEnvelope } from '../contracts/event-envelope.interface';
import { ObservationQueueService } from '../services/observation-queue.service';

@Injectable()
export class MemorySynchronizer
  implements IObservationSynchronizer, OnModuleInit
{
  private readonly logger = new Logger(MemorySynchronizer.name);

  constructor(private readonly queueService: ObservationQueueService) {}

  onModuleInit() {
    this.queueService.registerSynchronizer(this);
  }

  getName(): string {
    return MemorySynchronizer.name;
  }

  async synchronize(event: EventEnvelope): Promise<void> {
    this.logger.debug(
      `[MemorySynchronizer] Evaluating observation ${event.id} for long-term memory`,
    );
    // Route conversational/episodic logs to MemoriesService
    await Promise.resolve();
  }
}
