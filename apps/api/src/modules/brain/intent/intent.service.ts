import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ContextPayload } from '../contracts/context-payload';
import { Intent } from '../contracts/intent';
import { ReasonerService } from '../reasoner/reasoner.service';
import { BrainEvent } from '../events/enums/brain-event.enum';

@Injectable()
export class IntentService {
  private readonly logger = new Logger(IntentService.name);

  constructor(
    private readonly reasonerService: ReasonerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async extractIntent(query: string, context: ContextPayload): Promise<Intent> {
    this.logger.log(`Extracting intent for query: "${query}"`);

    const intent = await this.reasonerService.extractIntent(query, context);

    this.eventEmitter.emit(BrainEvent.INTENT_DETECTED, { query, intent });
    this.logger.log(
      `Intent detected: ${intent.category} - ${intent.objective}`,
    );

    return intent;
  }
}
