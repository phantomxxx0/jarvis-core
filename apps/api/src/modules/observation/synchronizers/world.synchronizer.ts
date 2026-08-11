import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IObservationSynchronizer } from '../contracts/synchronizer.interface';
import { EventEnvelope } from '../contracts/event-envelope.interface';
import { ObservationQueueService } from '../services/observation-queue.service';

@Injectable()
export class WorldSynchronizer
  implements IObservationSynchronizer, OnModuleInit
{
  private readonly logger = new Logger(WorldSynchronizer.name);

  constructor(private readonly queueService: ObservationQueueService) {}

  onModuleInit() {
    this.queueService.registerSynchronizer(this);
  }

  getName(): string {
    return WorldSynchronizer.name;
  }

  async synchronize(event: EventEnvelope): Promise<void> {
    this.logger.debug(
      `[WorldSynchronizer] Processing observation ${event.id} for World Model`,
    );
    // Here we would route environmental states and entity changes to the World Model
    await Promise.resolve();
  }
}
