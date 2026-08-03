import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ContextPayload } from '../contracts/context-payload';
import { Plan } from '../contracts/plan';
import { Decision } from '../contracts/decision';
import { BrainEvent } from '../events/enums/brain-event.enum';

@Injectable()
export class ReasonerService {
  private readonly logger = new Logger(ReasonerService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async evaluatePlan(plan: Plan, context: ContextPayload): Promise<Decision> {
    void context;
    this.logger.log(`Reasoner evaluating plan: ${plan.id}`);

    const decision: Decision = {
      approved: true,
      confidence: 1.0,
      reasoning: 'Plan dependencies resolve correctly and capabilities exist.',
      risks: ['Mock execution environment assumes success'],
      missingInformation: [],
      recommendations: [],
    };

    if (decision.approved) {
      this.eventEmitter.emit(BrainEvent.PLAN_APPROVED, { plan, decision });
    } else {
      this.eventEmitter.emit(BrainEvent.PLAN_REJECTED, { plan, decision });
    }

    return Promise.resolve(decision);
  }
}
