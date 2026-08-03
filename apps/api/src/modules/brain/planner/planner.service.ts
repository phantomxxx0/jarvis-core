import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';

import { ContextPayload } from '../contracts/context-payload';
import { Intent } from '../contracts/intent';
import { Plan } from '../contracts/plan';
import { BrainEvent } from '../events/enums/brain-event.enum';

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async createPlan(intent: Intent, context: ContextPayload): Promise<Plan> {
    void context;
    this.logger.log(`Creating plan for intent: ${intent.id} (${intent.type})`);

    // In a real implementation, we'd use an LLM via Reasoner or direct InferenceWorker
    // to decompose the Intent into a DAG of Tasks.
    // For now, we return a structural placeholder per architectural boundaries.

    const plan: Plan = {
      id: randomUUID(),
      intentId: intent.id,
      estimatedComplexity: 'LOW',
      tasks: [
        {
          id: randomUUID(),
          name: 'Respond to Intent',
          description: `Execute objective: ${intent.goal}`,
          capabilityRequired: 'CHAT',
          dependencies: [],
          inputs: { prompt: intent.goal },
          outputs: { result: 'string' },
          status: 'PENDING',
        },
      ],
    };

    this.eventEmitter.emit(BrainEvent.PLAN_CREATED, { plan });
    this.logger.log(`Plan created with ${plan.tasks.length} tasks.`);

    return Promise.resolve(plan);
  }
}
