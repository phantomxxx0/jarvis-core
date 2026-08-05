import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ContextService } from './context/context.service';
import { IntentService } from './intent/intent.service';
import { PlannerService } from './planner/planner.service';
import { ReasonerService } from './reasoner/reasoner.service';
import { ExecutionBuilderService } from './task-engine/execution-builder.service';
import { ExecutionSchedulerService } from './execution/execution-scheduler.service';
import { BrainEvent } from './events/enums/brain-event.enum';

import { ConversationsService } from '../conversations/conversations.service';
import { MemoriesService } from '../memories/memories.service';
import { WorkerRegistryService } from '../workers/registry/worker-registry.service';
import { WorkerKind } from '../workers/enums/worker-kind.enum';

@Injectable()
export class BrainService {
  private readonly logger = new Logger(BrainService.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly intentService: IntentService,
    private readonly plannerService: PlannerService,
    private readonly reasonerService: ReasonerService,
    private readonly executionBuilder: ExecutionBuilderService,
    private readonly executionSchedulerService: ExecutionSchedulerService,
    private readonly conversationsService: ConversationsService,
    private readonly memoriesService: MemoriesService,
    private readonly workerRegistry: WorkerRegistryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Sanitizes model output by removing internal reasoning tags (<think>...</think>)
   */
  private sanitizeResponse(text: string): string {
    if (!text) return '';
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  }

  async processChat(
    messages: Array<{ role: string; content: string }>,
    userId = 'system',
  ): Promise<{ answer: string; success: boolean; riskLevel?: string }> {
    const latestMessage = messages[messages.length - 1]?.content || '';
    const answer = await this.think(latestMessage, userId);
    return {
      answer,
      success: true,
    };
  }

  async processIntent(
    mission: string,
    contextSummary: string,
  ): Promise<unknown> {
    const startTime = Date.now();
    const intent = {
      category: 'PROJECT_INSPECTION',
      primaryGoal: mission,
      confidence: 0.95,
      rawParameters: {},
    };

    const rawPlan = await this.plannerService.createPlan(intent, contextSummary);
    const validatedPlan = await this.reasonerService.validatePlan(rawPlan);
    const executingPlan = this.executionBuilder.buildExecutionGraph(validatedPlan);

    await this.executionSchedulerService.schedulePlan(validatedPlan, contextSummary);
    const resultPlan = validatedPlan;

    return {
      traceId: `tr_${Date.now()}`,
      userPrompt: mission,
      stages: executingPlan.stages,
      finalResult: {
        success: resultPlan.status === 'COMPLETED',
        output: resultPlan.steps.map((s) => s.output),
        totalDurationMs: Date.now() - startTime,
      },
    };
  }

  async think(
    prompt: string,
    userId = 'system',
    onProgress?: (event: string, data: any) => void,
  ): Promise<string> {
    let retrievedContext = '';
    try {
      onProgress?.('status', { message: 'Searching memories and project context...' });
      const searchResults = await this.memoriesService.searchSimilar(userId, prompt, 3);
      if (searchResults && Array.isArray(searchResults) && searchResults.length > 0) {
        retrievedContext = searchResults
          .map((m: unknown) => ((m as Record<string, unknown>).content as string) || JSON.stringify(m))
          .join('\n---\n');
      }
    } catch (e) {
      this.logger.warn(`Memory search skipped or failed: ${(e as Error).message}`);
    }

    const enrichedPrompt = retrievedContext
      ? `Retrieved Project/Memory Context:\n${retrievedContext}\n\nUser Request: ${prompt}`
      : prompt;

    onProgress?.('status', { message: 'Extracting intent...' });
    const intent = await this.intentService.extractIntent(
      enrichedPrompt,
      {} as any,
    );

    let finalResponse = '';

    // --- CONVERSATIONAL SHORT-CIRCUIT ---
    if (intent.type === 'answer_question' || intent.type === 'UNKNOWN' || (!intent.requiresTools && !intent.requiresPlanning)) {
      onProgress?.('status', { message: 'Generating direct response...' });
      try {
        const workers = await this.workerRegistry.discover({ kind: WorkerKind.INFERENCE });
        if (workers.length > 0) {
          const worker = workers[0];
          const result = await worker.execute<any, any>({
            prompt: `You are Jarvis, an advanced AI engineering assistant. Respond naturally and helpfully to the user.\n\nUser: ${prompt}`,
          });
          if (result && result.success && result.data) {
            const rawText = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
            finalResponse = this.sanitizeResponse(rawText);
          }
        }
      } catch (err) {
        this.logger.warn(`Direct worker inference completion failed, falling back to planner: ${(err as Error).message}`);
      }
    }

    if (!finalResponse) {
      onProgress?.('status', { message: 'Creating execution plan & tools...' });
      const plan = await this.plannerService.createPlan(
        intent as unknown as Record<string, unknown>,
        enrichedPrompt,
      );

      const legacyPlanPayload = {
        ...plan,
        intentId: plan.goalId,
        tasks: plan.steps,
        estimatedComplexity: plan.steps.length,
      };

      const decision = await this.reasonerService.validatePlan(legacyPlanPayload);
      if (decision.status === 'FAILED' || decision.approval?.requiresApproval) {
        throw new Error(decision.approval?.approvalReason ?? 'Plan rejected by reasoner.');
      }

      await this.executionSchedulerService.schedulePlan(decision);

      const results = decision.steps.map((s) => ({
        taskId: s.id,
        status: s.status === 'COMPLETED' ? 'SUCCESS' : 'FAILED',
        output: s.output,
        error: s.error,
      }));

      const successfulResults = results.filter((r) => r.status === 'SUCCESS');
      if (successfulResults.length > 0) {
        const directResponse = decision.steps.find(
          (s) => s.action === 'direct_llm_response' && s.status === 'COMPLETED'
        );
        if (directResponse && directResponse.output && typeof (directResponse.output as any).answer === 'string') {
          finalResponse = this.sanitizeResponse((directResponse.output as any).answer);
        } else {
          const outputs = successfulResults.map((r) => {
            const outputObj = r.output as Record<string, unknown>;
            if (outputObj && typeof outputObj === 'object') {
              if (outputObj.path && outputObj.content) {
                return `### File: ${outputObj.path as string}\n\`\`\`json\n${outputObj.content as string}\n\`\`\``;
              }
              return `### Execution Result (${r.taskId})\n\`\`\`json\n${JSON.stringify(outputObj, null, 2)}\n\`\`\``;
            }
            return String(r.output);
          });
          finalResponse = this.sanitizeResponse(outputs.join('\n\n'));
        }
      } else {
        finalResponse = 'Execution completed, but no response was generated by the model.';
      }
    }

    if (!finalResponse || finalResponse.trim() === '') {
      finalResponse = 'Hello! I am Jarvis, your AI engineering assistant. How can I help you build or inspect your codebase today?';
    }

    await this.conversationsService.saveMessage(userId, { role: 'user', content: prompt });
    await this.conversationsService.saveMessage(userId, { role: 'assistant', content: finalResponse });

    try {
      const memory = await this.memoriesService.create({
        userId,
        type: 'SEMANTIC',
        origin: 'BRAIN',
        content: `User asked: ${prompt}. Response: ${finalResponse}`,
      });
      this.eventEmitter.emit(BrainEvent.MEMORY_STORED, { memory });
    } catch (e) {
      this.logger.warn(`Memory creation skipped: ${(e as Error).message}`);
    }

    this.eventEmitter.emit(BrainEvent.KNOWLEDGE_UPDATED, { userId, topic: intent.goal });

    return finalResponse;
  }
}
