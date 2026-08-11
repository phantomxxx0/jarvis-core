import { Injectable, Logger } from '@nestjs/common';
import { ObservationRepository } from '../repositories/observation.repository';
import { ObservationQueueService } from './observation-queue.service';
import { IdempotencyService } from './idempotency.service';
import { EventEnvelope } from '../contracts/event-envelope.interface';

export interface IngestObservationDto {
  userId?: string | null;
  scope?: 'USER' | 'SYSTEM';
  source: string;
  type: string;
  payload: Record<string, unknown>;
  confidence?: number;
  priority?: number;
  correlationId?: string;
  causationId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ObservationManagerService {
  private readonly logger = new Logger(ObservationManagerService.name);

  constructor(
    private readonly observationRepository: ObservationRepository,
    private readonly queueService: ObservationQueueService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async ingestObservation(dto: IngestObservationDto): Promise<void> {
    this.logger.debug(
      `Ingesting observation from ${dto.source} (type: ${dto.type})`,
    );

    // Validation and deduplication safeguards
    const hash = this.idempotencyService.generateHash(
      dto.source,
      dto.type,
      dto.correlationId,
      dto.payload,
    );

    if (this.idempotencyService.isProcessed(hash)) {
      this.logger.debug(
        `Idempotency hit for hash ${hash}. Silently dropping duplicate event.`,
      );
      return;
    }

    // Determine scope (fallback to USER if user_id is provided, otherwise SYSTEM)
    const observationScope = dto.scope ?? (dto.userId ? 'USER' : 'SYSTEM');

    // Create the append-only observation
    const observation = await this.observationRepository.create({
      userId: dto.userId ?? null,
      observationScope,
      source: dto.source,
      type: dto.type,
      payload: dto.payload,
      confidence: dto.confidence ?? 50,
      priority: dto.priority ?? 0,
      correlationId: dto.correlationId,
      causationId: dto.causationId,
      metadata: { ...dto.metadata, dedupeHash: hash },
      status: 'PENDING',
    });

    this.idempotencyService.markProcessed(hash);

    this.logger.log(
      `Created observation ${observation.id}. Queuing for synchronizers.`,
    );

    const envelope: EventEnvelope = {
      id: observation.id,
      type: observation.type,
      source: observation.source,
      timestamp: observation.createdAt,
      correlationId: observation.correlationId || undefined,
      causationId: observation.causationId || undefined,
      priority: observation.priority,
      payload: observation.payload as Record<string, unknown>,
      metadata: observation.metadata as Record<string, unknown>,
      schemaVersion: '1.0',
      producerVersion: '1.0',
    };

    // Push to queue asynchronously without awaiting/blocking
    this.queueService.pushEvent(envelope).catch((err) => {
      this.logger.error(`Failed to push event ${envelope.id} to queue: ${err}`);
    });
  }
}
