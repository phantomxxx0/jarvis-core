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
  ) { }

  /**
   * Main controller adapter for chat message arrays.
   */
  async processChat(messages: Array<{ role: string; content: string }>, userId = 'system'): Promise<{ answer: string; success: boolean; riskLevel?: string }> {
    const latestMessage = messages[messages.length - 1]?.content || '';
    const answer = await this.think(latestMessage, userId);
    return {
      answer,
      success: true,
    };
  }

  async think(prompt: string, userId = 'system', onProgress?: (event: string, data: any) => void): Promise<string> {
    let retrievedContext = '';
    try {
      onProgress?.('status', { message: 'Searching memories and project context...' });
      const searchResults = await (this.memoriesService as any).search?.({
        userId,
        query: prompt,
        limit: 3,
      });
      if (searchResults && Array.isArray(searchResults) && searchResults.length > 0) {
        retrievedContext = searchResults.map((m: any) => m.content || JSON.stringify(m)).join('\n---\n');
      }
    } catch (e) {
      this.logger.warn(`Memory search skipped or failed: ${e.message}`);
    }

    const enrichedPrompt = retrievedContext
      ? `Retrieved Project/Memory Context:\n${retrievedContext}\n\nUser Request: ${prompt}`
      : prompt;

    onProgress?.('status', { message: 'Building operational context...' });
    const context = await this.contextService.buildContext(userId, enrichedPrompt);

    onProgress?.('status', { message: 'Extracting intent...' });
    const intent = await this.intentService.extractIntent(enrichedPrompt, context);

    onProgress?.('status', { message: 'Creating execution plan & tools...' });
    const plan = await this.plannerService.createPlan(intent, context);

    onProgress?.('plan_created', { planId: plan.id, stepsCount: plan.steps.length });

    const legacyPlanPayload = {
      ...plan,
      intentId: plan.goalId,
      tasks: plan.steps.map(step => ({
        ...step,
        capabilityRequired: step.action === 'direct_llm_response' ? 'CHAT' : 'UNKNOWN'
      })),
      estimatedComplexity: plan.steps.length,
    };

    onProgress?.('status', { message: 'Evaluating plan safety & governance...' });
    const decision = await this.reasonerService.evaluatePlan(legacyPlanPayload as any, context);

    if (!decision.approved) {
      throw new Error(decision.reasoning ?? 'Plan rejected.');
    }

    onProgress?.('status', { message: 'Executing tasks and operational tools...' });
    const execution = this.executionBuilder.build(legacyPlanPayload as any);
    const results = await this.taskEngineService.execute(execution);

    for (const res of results) {
      onProgress?.('task_completed', { taskId: res.taskId, status: res.status });
    }

    let finalResponse = '';
    const successfulResults = results.filter(r => r.status === 'SUCCESS');
    if (successfulResults.length > 0) {
      const outputs = successfulResults.map(r => {
        const outputObj = r.output as any;
        if (outputObj && typeof outputObj === 'object') {
          if (outputObj.path && outputObj.content) {
            return `### File: ${outputObj.path}\n\`\`\`json\n${outputObj.content}\n\`\`\``;
          }
          return `### Execution Result (${r.taskId})\n\`\`\`json\n${JSON.stringify(outputObj, null, 2)}\n\`\`\``;
        }
        return String(r.output);
      });
      finalResponse = outputs.join('\n\n');
    } else {
      const errors = results.filter((r) => r.status === 'FAILED').map((r) => r.error ?? 'Unknown error');
      if (errors.length > 0) {
        throw new Error(`Execution failed:\n${errors.join('\n')}`);
      }
      finalResponse = 'Execution completed successfully.';
    }

    await this.conversationsService.saveMessage(userId, {
      role: 'user',
      content: prompt,
    });
    await this.conversationsService.saveMessage(userId, {
      role: 'assistant',
      content: finalResponse,
    });

    try {
      const memory = await this.memoriesService.create({
        userId,
        type: 'SEMANTIC',
        origin: 'BRAIN',
        content: `User asked: ${prompt}. Response: ${finalResponse}`,
      } as any);

      this.eventEmitter.emit(BrainEvent.MEMORY_STORED, { memory });
      this.logger.log(`Memory stored for user ${userId}`);
    } catch (e) {
      this.logger.warn(`Memory creation skipped: ${e.message}`);
    }

    this.eventEmitter.emit(BrainEvent.KNOWLEDGE_UPDATED, {
      userId,
      topic: intent.goal,
    });

    return finalResponse;
  }
}