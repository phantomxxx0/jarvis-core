import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';

import { Plan } from '../contracts/plan';
import { ExecutionPlan } from '../contracts/execution-plan';
import { BrainEvent } from '../events/enums/brain-event.enum';

@Injectable()
export class ExecutionBuilderService {
  private readonly logger = new Logger(ExecutionBuilderService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  build(plan: Plan): ExecutionPlan {
    this.logger.log(`Building ExecutionPlan from Plan: ${plan.id}`);

    const executionPlan: ExecutionPlan = {
      id: randomUUID(),
      planId: plan.id,
      status: 'PENDING',
      pendingTasks: [...plan.tasks],
      completedTasks: [],
    };

    this.eventEmitter.emit(BrainEvent.EXECUTION_PLAN_BUILT, { executionPlan });

    return executionPlan;
  }
}
