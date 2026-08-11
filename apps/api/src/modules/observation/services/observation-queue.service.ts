import { Injectable, Logger } from '@nestjs/common';
import { EventEnvelope } from '../contracts/event-envelope.interface';
import { IObservationSynchronizer } from '../contracts/synchronizer.interface';
import { ObservationDlqRepository } from '../repositories/observation-dlq.repository';

interface QueueItem {
  event: EventEnvelope;
  synchronizer: IObservationSynchronizer;
  attempt: number;
}

@Injectable()
export class ObservationQueueService {
  private readonly logger = new Logger(ObservationQueueService.name);
  private synchronizers: IObservationSynchronizer[] = [];

  // Simple in-memory priority queue structure (0: CRITICAL, 1: HIGH, 2: NORMAL, 3: LOW)
  private readonly queue: QueueItem[][] = [[], [], [], []];
  private isProcessing = false;

  constructor(private readonly dlqRepository: ObservationDlqRepository) {}

  public registerSynchronizer(synchronizer: IObservationSynchronizer): void {
    this.synchronizers.push(synchronizer);
    this.logger.log(`Registered synchronizer: ${synchronizer.getName()}`);
  }

  public async pushEvent(event: EventEnvelope): Promise<void> {
    // Map priority to queue index: higher priority number (e.g., 90) -> lower index (CRITICAL = 0)
    let priorityIndex = 2; // NORMAL
    if (event.priority >= 90)
      priorityIndex = 0; // CRITICAL
    else if (event.priority >= 75)
      priorityIndex = 1; // HIGH
    else if (event.priority < 25) priorityIndex = 3; // LOW

    // We enqueue the event for EACH registered synchronizer independently
    for (const sync of this.synchronizers) {
      this.queue[priorityIndex].push({
        event,
        synchronizer: sync,
        attempt: 0,
      });
    }

    this.logger.debug(
      `Enqueued event ${event.id} for ${this.synchronizers.length} synchronizers at priority index ${priorityIndex}`,
    );

    // Start processing if not already
    this.processQueue().catch((err) => {
      this.logger.error(`Queue processing error: ${err}`);
    });

    await Promise.resolve(); // satisfy require-await
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (true) {
        const item = this.dequeueNext();
        if (!item) {
          break; // Queue is empty
        }

        await this.processItem(item);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private dequeueNext(): QueueItem | undefined {
    // Priority order: 0, 1, 2, 3
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].length > 0) {
        return this.queue[i].shift();
      }
    }
    return undefined;
  }

  private async processItem(item: QueueItem): Promise<void> {
    const { event, synchronizer, attempt } = item;
    try {
      await synchronizer.synchronize(event);
      this.logger.debug(
        `Successfully processed event ${event.id} by ${synchronizer.getName()}`,
      );
    } catch (error) {
      this.logger.warn(
        `Synchronizer ${synchronizer.getName()} failed on event ${event.id} (Attempt ${attempt + 1})`,
      );
      await this.handleFailure(
        item,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async handleFailure(
    item: QueueItem,
    errorReason: string,
  ): Promise<void> {
    item.attempt++;
    const maxAttempts = 4; // Hardcoded policy for now: 1s, 2s, 4s, 8s backoff

    if (item.attempt >= maxAttempts) {
      this.logger.error(
        `Max retries reached for event ${item.event.id} on ${item.synchronizer.getName()}. Routing to DLQ.`,
      );
      await this.dlqRepository.create({
        originalObservationId: item.event.id,
        synchronizer: item.synchronizer.getName(),
        errorReason,
        retryCount: item.attempt,
      });
      return;
    }

    const backoffMs = Math.min(1000 * Math.pow(2, item.attempt - 1), 8000);
    this.logger.log(
      `Scheduling retry in ${backoffMs}ms for event ${item.event.id} on ${item.synchronizer.getName()}`,
    );

    setTimeout(() => {
      // Re-enqueue at the SAME priority index. We find it by the event's priority.
      let priorityIndex = 2;
      if (item.event.priority >= 90) priorityIndex = 0;
      else if (item.event.priority >= 75) priorityIndex = 1;
      else if (item.event.priority < 25) priorityIndex = 3;

      this.queue[priorityIndex].push(item);
      this.processQueue().catch((err) => {
        this.logger.error(`Queue processing error from setTimeout: ${err}`);
      });
    }, backoffMs);
  }
}
