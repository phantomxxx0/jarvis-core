import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import {
  PerceptionProvider,
  PERCEPTION_PROVIDERS,
} from './contracts/perception-provider.interface';
import { PerceptionEvent } from './contracts/perception-event.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PerceptionManagerService {
  private readonly logger = new Logger(PerceptionManagerService.name);

  constructor(
    @Optional()
    @Inject(PERCEPTION_PROVIDERS)
    private readonly providers: PerceptionProvider[] = [],
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  public async ingestEvent(event: PerceptionEvent): Promise<void> {
    this.logger.log(
      `[Perception Ingest] Source: ${event.sourceType} (${event.sourceId}) - ID: ${event.id}`,
    );

    if (this.eventEmitter) {
      await this.eventEmitter.emitAsync(
        `perception.${event.sourceType.toLowerCase()}`,
        event,
      );
      await this.eventEmitter.emitAsync('perception.any', event);
    }
  }

  public async pollProviders(): Promise<PerceptionEvent[]> {
    if (!this.providers || this.providers.length === 0) return [];

    const events: PerceptionEvent[] = [];

    for (const provider of this.providers) {
      try {
        if (provider.poll && (await provider.isHealthy())) {
          const providerEvents = await provider.poll();
          events.push(...providerEvents);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Provider ${provider.name} failed during poll: ${errorMsg}`,
        );
      }
    }

    return events;
  }
}
