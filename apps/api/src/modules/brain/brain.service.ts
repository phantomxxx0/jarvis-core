import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ContextService } from './context/context.service';
import { IntentService } from './intent/intent.service';
import { PlannerService } from './planner/planner.service';
import { ReasonerService } from './reasoner/reasoner.service';
import { TaskEngineService } from './task-engine/task-engine.service';
import { ExecutionBuilderService } from './task-engine/execution-builder.service';
import { BrainEvent } from './events/enums/brain-event.enum';

import { ConversationsService } from '../conversations/conversations.service';
import { MemoriesService } from '../memories/memories.service';

@Injectable()
export class BrainService {
  private readonly logger = new Logger(BrainService.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly intentService: IntentService,
    private readonly plannerService: PlannerService,
    private readonly reasonerService: ReasonerService,
    private readonly executionBuilder: ExecutionBuilderService,
    private readonly taskEngineService: TaskEngineService,
    private readonly conversationsService: ConversationsService,
    private readonly memoriesService: MemoriesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async think(prompt: string, userId = 'system'): Promise<string> {
    const context = await this.contextService.buildContext(userId, prompt);
    const intent = await this.intentService.extractIntent(prompt, context);
    const plan = await this.plannerService.createPlan(intent, context);

    const decision = await this.reasonerService.evaluatePlan(plan, context);

    if (!decision.approved) {
      throw new Error(decision.reasoning ?? 'Plan rejected.');
    }

    const execution = this.executionBuilder.build(plan);
    const results = await this.taskEngineService.execute(execution);

    const chatResult = results.find(
      (result) =>
        result.status === 'SUCCESS' &&
        plan.tasks.find((t) => t.id === result.taskId)?.capabilityRequired ===
          'CHAT',
    );

    let finalResponse = 'Execution finished';

    if (chatResult?.output) {
      finalResponse =
        typeof chatResult.output === 'string'
          ? chatResult.output
          : JSON.stringify(chatResult.output);
    } else {
      const errors = results
        .filter((r) => r.status === 'FAILED')
        .map((r) => r.error ?? 'Unknown error');

      if (errors.length > 0) {
        throw new Error(`Execution failed:\n${errors.join('\n')}`);
      }

      finalResponse = JSON.stringify(results);
    }

    // Post-execution Memory & Knowledge Pipeline
    // 1. Save Conversation
    await this.conversationsService.saveMessage(userId, {
      role: 'user',
      content: prompt,
    });
    await this.conversationsService.saveMessage(userId, {
      role: 'assistant',
      content: finalResponse,
    });

    // 2. Store Short-term memory summary (simulate)
    const memory = await this.memoriesService.create({
      userId,
      type: 'SEMANTIC',
      origin: 'BRAIN',
      content: `User asked: ${prompt}. Response: ${finalResponse}`,
    });

    this.eventEmitter.emit(BrainEvent.MEMORY_STORED, { memory });
    this.logger.log(`Memory stored for user ${userId}`);

    // Batch 10 placeholder: Emit Knowledge Updated
    this.eventEmitter.emit(BrainEvent.KNOWLEDGE_UPDATED, {
      userId,
      topic: intent.goal,
    });

    return finalResponse;
  }
}
