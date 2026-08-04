import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IObservationSynchronizer } from '../contracts/synchronizer.interface';
import { EventEnvelope } from '../contracts/event-envelope.interface';
import { ObservationQueueService } from '../services/observation-queue.service';

@Injectable()
export class LearningSynchronizer
  implements IObservationSynchronizer, OnModuleInit
{
  private readonly logger = new Logger(LearningSynchronizer.name);

  constructor(private readonly queueService: ObservationQueueService) {}

  onModuleInit() {
    this.queueService.registerSynchronizer(this);
  }

  getName(): string {
    return LearningSynchronizer.name;
  }

  async synchronize(event: EventEnvelope): Promise<void> {
    this.logger.debug(
      `[LearningSynchronizer] Processing observation ${event.id} for Personal Intelligence`,
    );
    // Here we would evaluate habits, preferences, projects, goals
    await Promise.resolve();
  }
}
