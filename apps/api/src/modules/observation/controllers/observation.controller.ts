import {
  Controller,
  Get,
  Post,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { ObservationRepository } from '../repositories/observation.repository';
import { ObservationDlqRepository } from '../repositories/observation-dlq.repository';
import { ObservationQueueService } from '../services/observation-queue.service';
import { EventEnvelope } from '../contracts/event-envelope.interface';

@Controller('events')
export class ObservationController {
  constructor(
    private readonly observationRepo: ObservationRepository,
    private readonly dlqRepo: ObservationDlqRepository,
    private readonly queueService: ObservationQueueService,
  ) {}

  @Get('dlq')
  async getDlq() {
    return this.dlqRepo.getDlqEvents();
  }

  @Post('replay/:id')
  async replayEvent(@Param('id') id: string) {
    const observation = await this.observationRepo.findById(id);
    if (!observation) {
      throw new NotFoundException(`Observation with ID ${id} not found.`);
    }

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

    // Pump directly into the queue
    await this.queueService.pushEvent(envelope);

    return { status: 'REPLAY_QUEUED', eventId: id };
  }
}
