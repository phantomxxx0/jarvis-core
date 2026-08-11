import { Injectable, Logger } from '@nestjs/common';
import { RuntimeContextService } from '../context/runtime-context.service';
import { ReasonerService } from '../reasoner/reasoner.service';
import { PlannerService } from '../planner/planner.service';
import { ExecutionRunnerService } from '../execution/execution-runner.service';
import { ReflectionService } from '../reflection/reflection.service';
import { LearningService } from '../learning/learning.service';
import { ContextComposerService } from '../../memory/retrieval/context-composer.service';
import { IntentService } from '../intent/intent.service';
import { ConversationsService } from '../../conversations/conversations.service';
import { WorkerRegistryService } from '../../workers/registry/worker-registry.service';
import { WorkerKind } from '../../workers/enums/worker-kind.enum';
import { IdentityService } from '../../governance/identity/identity.service';
import type { ExecutionContext } from '../../governance/interfaces/execution-context.interface';

export interface AutonomousConfig {
  maxLoops: number;
  confidenceThreshold: number;
}

export interface CognitiveTrace {
  traceId: string;
  contextTime: number;
  reasonTime: number;
  planningTime: number;
  executionTime: number;
  reflectionTime: number;
  learningTime: number;
  memoryWrites: number;
  finalResponse: string;
}

export interface ExecutionResponse {
  answer: string;
  success: boolean;
  trace: CognitiveTrace;
}

@Injectable()
export class AutonomousExecutionController {
  private readonly logger = new Logger(AutonomousExecutionController.name);

  constructor(
    private readonly contextService: RuntimeContextService,
    private readonly reasoner: ReasonerService,
    private readonly planner: PlannerService,
    private readonly runner: ExecutionRunnerService,
    private readonly reflection: ReflectionService,
    private readonly learning: LearningService,
    private readonly contextComposer: ContextComposerService,
    private readonly intentService: IntentService,
    private readonly conversationsService: ConversationsService,
    private readonly workerRegistry: WorkerRegistryService,
    private readonly identityService: IdentityService,
  ) {}

  /**
   * Sanitizes model output by removing internal reasoning tags (<think>...</think>)
   */
  private sanitizeResponse(text: string): string {
    if (!text) return '';
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  }

  public async executeGoal(
    goal: string,
    userId: string,
    config: AutonomousConfig = { maxLoops: 3, confidenceThreshold: 80 },
  ): Promise<ExecutionResponse> {
    const traceId = `trace_${Date.now()}`;
    const trace: CognitiveTrace = {
      traceId,
      contextTime: 0,
      reasonTime: 0,
      planningTime: 0,
      executionTime: 0,
      reflectionTime: 0,
      learningTime: 0,
      memoryWrites: 0,
      finalResponse: '',
    };

    // Governance: build ExecutionContext once per goal, before any
    // execution occurs. Unlike BrainV2Service, this path only receives a
    // bare userId string (no sessionId) — sessionId is set to userId as a
    // placeholder identifier for the audit trail; it does not correspond
    // to a real auth session for this call path. A thrown error here
    // means the goal cannot proceed at all: caught by the caller
    // (BrainService.think/processChat), which has no existing error
    // handling of its own for executeGoal() — this will surface as an
    // unhandled rejection until BrainService is updated to catch it
    // explicitly. Flagging rather than silently deciding that behavior.
    let executionContext: ExecutionContext | undefined;
    try {
      executionContext = await this.identityService.buildContext({
        id: userId,
        sessionId: userId,
      });
    } catch (err) {
      this.logger.error(
        `[AutonomousExecutionController] Failed to build ExecutionContext for user=${userId}: ${(err as Error).message}`,
      );
      throw err;
    }

    // 1. Intent Classification
    this.logger.log('Extracting intent...');
    const intent = await this.intentService.extractIntent(goal, {} as any);
    const intentType = intent.type ? String(intent.type).toLowerCase() : '';

    // Greeting / Lightweight Path
    const isConversational =
      intentType === 'greeting' ||
      (intentType === 'chat' &&
        !intent.requiresTools &&
        !intent.requiresPlanning);

    if (isConversational) {
      this.logger.log('Executing lightweight conversational path...');
      let finalResponse = '';
      try {
        const cognitiveContext = await this.contextComposer.compose({
          query: goal,
          userId,
        });
        const history = await this.conversationsService.getRecentMessages(
          userId,
          5,
        );
        const historyText = history
          ? history
              .map(
                (m) =>
                  `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`,
              )
              .join('\n')
          : '';

        const enrichedPrompt = `Context:\n${cognitiveContext}\nHistory:\n${historyText}\nUser: ${goal}`;

        const workers = await this.workerRegistry.discover({
          kind: WorkerKind.INFERENCE,
        });
        if (workers.length > 0) {
          const worker = workers[0];
          const result = await worker.execute<any, any>({
            prompt: `You are Jarvis, a personal AI assistant. Reply briefly and conversationally.\n\n${enrichedPrompt}`,
          });
          if (result && result.success && result.data) {
            finalResponse = this.sanitizeResponse(
              typeof result.data === 'string'
                ? result.data
                : JSON.stringify(result.data),
            );
          }
        }
      } catch (err) {
        this.logger.warn(`Lightweight path failed: ${(err as Error).message}`);
      }

      if (!finalResponse || finalResponse.trim() === '') {
        finalResponse =
          'Hello! I am Jarvis, your AI engineering assistant. How can I help you today?';
      }

      await this.conversationsService.saveMessage(userId, {
        role: 'user',
        content: goal,
      });
      await this.conversationsService.saveMessage(userId, {
        role: 'assistant',
        content: finalResponse,
      });

      trace.finalResponse = finalResponse;
      return { answer: finalResponse, success: true, trace };
    }

    let loopCount = 0;
    let goalAchieved = false;
    let currentGoal = goal;
    let finalAnswer = '';

    while (loopCount < config.maxLoops && !goalAchieved) {
      loopCount++;
      this.logger.log(
        `--- Starting Autonomous Loop ${loopCount}/${config.maxLoops} ---`,
      );

      // 1. Observe / Retrieve Context
      const tContextStart = Date.now();
      const runtimeState =
        await this.contextService.buildRuntimeContext(currentGoal);
      let contextText = runtimeState.contextText;

      const cognitiveContext = await this.contextComposer.compose({
        query: currentGoal,
        userId,
      });
      if (cognitiveContext) {
        contextText +=
          '\n\n--- Cognitive Memory Summary ---\n' + cognitiveContext;
        runtimeState.contextText = contextText;
      }
      trace.contextTime += Date.now() - tContextStart;

      // 2. Reason
      const tReasonStart = Date.now();
      const reasoningResult = await this.reasoner.reason(
        currentGoal,
        contextText,
      );
      trace.reasonTime += Date.now() - tReasonStart;
      this.logger.log(
        `Reasoning Output: Complexity=${reasoningResult.estimatedComplexity}, Strategy=${reasoningResult.executionStrategy}`,
      );

      if (reasoningResult.requiresClarification) {
        this.logger.warn(
          `Clarification required: ${reasoningResult.clarificationQuestions?.join(', ')}`,
        );
        if (!reasoningResult.isAutonomousSafe) {
          this.logger.error(
            'Goal is not autonomous safe and requires clarification. Aborting.',
          );
          return {
            answer: 'Clarification required. Aborting.',
            success: false,
            trace,
          };
        }
      }

      // 3. Plan
      const tPlanStart = Date.now();
      const intent = { primaryGoal: currentGoal, category: 'AUTONOMOUS' };
      const plan = await this.planner.createPlan(intent, runtimeState);
      trace.planningTime += Date.now() - tPlanStart;

      // 4. Execute
      const tExecStart = Date.now();
      let executionTrace = '';
      let executionSuccess = true;
      let lastOutput: unknown = undefined;

      try {
        for (const step of plan.steps) {
          this.logger.log(`Executing step: ${step.name}`);
          const output = await this.runner.executeTask(
            step as any,
            runtimeState,
            executionContext,
          );
          executionTrace += `Step [${step.name}] SUCCESS: ${JSON.stringify(output)}\n`;
          lastOutput = output;
          if (
            step.action === 'direct_llm_response' &&
            output &&
            typeof (output as any).answer === 'string'
          ) {
            finalAnswer = (output as any).answer;
          }
        }
      } catch (error) {
        executionSuccess = false;
        executionTrace += `Execution FAILED: ${(error as Error).message}\n`;
        this.logger.error(`Execution failed: ${(error as Error).message}`);
      }
      trace.executionTime += Date.now() - tExecStart;

      // 5 & 6. Evaluate & Reflect (ALWAYS RUNS)
      const tReflectStart = Date.now();
      const report = await this.reflection.reflect(
        plan.goalId,
        plan.id,
        currentGoal,
        executionTrace,
        executionSuccess,
      );
      trace.reflectionTime += Date.now() - tReflectStart;

      // 7. Learn
      const tLearnStart = Date.now();
      await this.learning.learn(report, userId);
      trace.learningTime += Date.now() - tLearnStart;
      // Tracing memory writes could be done by intercepting EventEmitter, but we'll approximate based on learning events.
      trace.memoryWrites +=
        (report.suggestedImprovements?.length || 0) +
        (report.executionMistakes?.length || 0) +
        1; // 1 for episode

      // 8. Loop Condition
      if (
        executionSuccess &&
        report.success &&
        report.executionMistakes.length === 0
      ) {
        goalAchieved = true;
        this.logger.log(`Goal successfully achieved in ${loopCount} loops!`);
        if (!finalAnswer && lastOutput) {
          finalAnswer =
            typeof lastOutput === 'string'
              ? lastOutput
              : JSON.stringify(lastOutput);
        }
      } else {
        this.logger.warn(
          `Goal not fully achieved. Replanning for next loop based on reflection.`,
        );
        if (report.suggestedImprovements.length > 0) {
          currentGoal = `${goal} (Previous attempt failed. Apply improvements: ${report.suggestedImprovements.join(', ')})`;
        }
      }
    }

    if (!goalAchieved) {
      this.logger.warn(
        `Autonomous loop exhausted after ${config.maxLoops} loops without fully achieving the goal.`,
      );
      if (!finalAnswer)
        finalAnswer = 'Autonomous loop failed to complete the goal fully.';
    }

    finalAnswer = this.sanitizeResponse(finalAnswer);
    trace.finalResponse = finalAnswer;

    // Save interaction turn atomically and emit event
    await this.conversationsService.saveInteractionTurn(
      userId,
      goal,
      finalAnswer,
    );

    // Log the cognitive trace (Operational Telemetry)
    this.logger.log(`Cognitive Trace: ${JSON.stringify(trace)}`);

    return {
      answer: finalAnswer,
      success: goalAchieved,
      trace,
    };
  }
}
