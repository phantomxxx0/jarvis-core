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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Main controller adapter for chat message arrays.
   */
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

    // 1. Planning
    const rawPlan = await this.plannerService.createPlan(
      intent,
      contextSummary,
    );

    // 2. Reason & Validate
    const validatedPlan = await this.reasonerService.validatePlan(rawPlan);

    // 3. Stage Building
    const executingPlan =
      this.executionBuilder.buildExecutionGraph(validatedPlan);

    // 4. Execution with Self-Healing via Scheduler
    await this.executionSchedulerService.schedulePlan(
      validatedPlan,
      contextSummary,
    );
    const resultPlan = validatedPlan;

    // 5. Trace Construction
    const trace = {
      traceId: `tr_${Date.now()}`,
      userPrompt: mission,
      intent: {
        category: intent.category,
        goal: intent.primaryGoal,
        confidence: intent.confidence,
      },
      brainPlan: {
        nodeCount: rawPlan.steps.length,
        edgeCount: rawPlan.steps.reduce(
          (acc, step) => acc + (step.dependencies?.length || 0),
          0,
        ),
        hasCycles: false,
      },
      validatedBrainPlan: {
        isValid:
          validatedPlan.status === 'VALIDATED' ||
          validatedPlan.status === 'COMPLETED',
        reasoningNotes: [
          validatedPlan.approval?.approvalReason || 'Auto-approved by Reasoner',
        ],
      },
      stages: executingPlan.stages.map((stage, idx) => ({
        stageIndex: idx,
        isParallel: stage.steps.length > 1,
        stepIds: stage.steps.map((s) => s.id),
        durationMs: 0, // Mock duration for telemetry contract
        steps: stage.steps.map((s) => ({
          stepId: s.id,
          toolName: s.capabilityRequired || s.action,
          input: s.arguments || {},
          output: s.output || {},
          status: s.status,
          durationMs: 0, // Mock duration for telemetry contract
        })),
      })),
      selfHealingEvents: [],
      finalResult: {
        success: resultPlan.status === 'COMPLETED',
        output: resultPlan.steps.map((s) => s.output),
        totalDurationMs: Date.now() - startTime,
      },
    };

    return trace;
  }

  async think(
    prompt: string,
    userId = 'system',
    onProgress?: (event: string, data: any) => void,
  ): Promise<string> {
    let retrievedContext = '';
    try {
      onProgress?.('status', {
        message: 'Searching memories and project context...',
      });
      const searchResults = await this.memoriesService.searchSimilar(
        userId,
        prompt,
        3,
      );
      if (
        searchResults &&
        Array.isArray(searchResults) &&
        searchResults.length > 0
      ) {
        retrievedContext = searchResults
          .map(
            (m: unknown) =>
              ((m as Record<string, unknown>).content as string) ||
              JSON.stringify(m),
          )
          .join('\n---\n');
      }
    } catch (e) {
      this.logger.warn(
        `Memory search skipped or failed: ${(e as Error).message}`,
      );
    }

    const enrichedPrompt = retrievedContext
      ? `Retrieved Project/Memory Context:\n${retrievedContext}\n\nUser Request: ${prompt}`
      : prompt;

    onProgress?.('status', { message: 'Building operational context...' });
    const context = await this.contextService.getContextBundle(enrichedPrompt);

    onProgress?.('status', { message: 'Extracting intent...' });
    const intent = await this.intentService.extractIntent(
      enrichedPrompt,
      context as unknown as Parameters<
        InstanceType<typeof IntentService>['extractIntent']
      >[1],
    );

    onProgress?.('status', { message: 'Creating execution plan & tools...' });
    const plan = await this.plannerService.createPlan(
      intent as unknown as Record<string, unknown>,
      context,
    );

    onProgress?.('plan_created', {
      planId: plan.id,
      stepsCount: plan.steps.length,
    });

    const legacyPlanPayload = {
      ...plan,
      intentId: plan.goalId,
      tasks: plan.steps.map((step) => ({
        ...step,
        capabilityRequired:
          step.action === 'direct_llm_response' ? 'CHAT' : 'UNKNOWN',
      })),
      estimatedComplexity: plan.steps.length,
    };

    onProgress?.('status', {
      message: 'Evaluating plan safety & governance...',
    });
    // Delegate routing decision back to the reasoner/planner dynamically
    const decision = await this.reasonerService.validatePlan(legacyPlanPayload);

    if (decision.status === 'FAILED' || decision.approval?.requiresApproval) {
      throw new Error(
        decision.approval?.approvalReason ?? 'Plan rejected by reasoner.',
      );
    }

    onProgress?.('status', {
      message: 'Executing tasks and operational tools...',
    });
    this.executionBuilder.buildExecutionGraph(
      legacyPlanPayload as unknown as Parameters<
        InstanceType<typeof ExecutionBuilderService>['buildExecutionGraph']
      >[0],
    );
    await this.executionSchedulerService.schedulePlan(decision);

    // For legacy UI compatibility, we mock the results array since we execute mutably on the plan object now
    const results = decision.steps.map((s) => ({
      taskId: s.id,
      status: s.status === 'COMPLETED' ? 'SUCCESS' : 'FAILED',
      output: s.output,
      error: s.error,
    }));

    for (const res of results) {
      onProgress?.('task_completed', {
        taskId: res.taskId,
        status: res.status,
      });
    }

    let finalResponse = '';
    const successfulResults = results.filter((r) => r.status === 'SUCCESS');
    if (successfulResults.length > 0) {
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
      finalResponse = outputs.join('\n\n');
    } else {
      const errors = results
        .filter((r) => r.status === 'FAILED')
        .map((r) => r.error ?? 'Unknown error');
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
      });

      this.eventEmitter.emit(BrainEvent.MEMORY_STORED, { memory });
      this.logger.log(`Memory stored for user ${userId}`);
    } catch (e) {
      this.logger.warn(`Memory creation skipped: ${(e as Error).message}`);
    }

    this.eventEmitter.emit(BrainEvent.KNOWLEDGE_UPDATED, {
      userId,
      topic: intent.goal,
    });

    return finalResponse;
  }
}
