import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { BrainInput } from './contracts/brain-input';
import type { BrainOutput } from './contracts/brain-output';
import type { CognitiveContext } from './contracts/cognitive-context';
import type { CognitiveTrace } from './contracts/cognitive-state';
import type { PerceptionResult } from './contracts/perception-result';
import type { ExecutiveDecision } from './contracts/executive-decision';
import type { WorkingMemoryState } from './contracts/working-memory';
import type { LanguageResult } from './contracts/language-result';
import { PerceptionService } from './perception/perception.service';
import { AttentionService } from './attention/attention.service';
import { ExecutiveService } from './executive/executive.service';
import { LanguageGenerator } from './language/language.service';
import { WorkingMemoryService } from './working-memory/working-memory.service';
import { EmotionService } from './emotion/emotion.service';
import { SchedulerService } from './scheduler/scheduler.service';
import { ReflectionGateway } from './reflection/reflection.service';
import { LearningGateway } from './learning/learning.service';
import { InternalStateTracker } from './consciousness/internal-state';
import { LatencyTracker, CognitionMetricsService } from './metrics/latency';
import { generateTraceId } from './utils/cognitive-math';
import { BrainV2Event } from './events/brain.events';
import { UsersService } from '../users/users.service';
import { ConversationsService } from '../conversations/conversations.service';
import {
  PreferenceMemoryService,
  PreferenceMemoryData,
} from '../memory/adapters/preference-memory.service';
import { IdentityService } from '../governance/identity/identity.service';

@Injectable()
export class BrainV2Service {
  private readonly logger = new Logger(BrainV2Service.name);

  constructor(
    private readonly perception: PerceptionService,
    private readonly attention: AttentionService,
    private readonly executive: ExecutiveService,
    private readonly language: LanguageGenerator,
    private readonly workingMemory: WorkingMemoryService,
    private readonly emotion: EmotionService,
    private readonly scheduler: SchedulerService,
    private readonly reflection: ReflectionGateway,
    private readonly learning: LearningGateway,
    private readonly internalState: InternalStateTracker,
    private readonly cognitionMetrics: CognitionMetricsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly usersService: UsersService,
    private readonly conversationsService: ConversationsService,
    private readonly preferenceMemory: PreferenceMemoryService,
    private readonly identityService: IdentityService,
  ) {}

  async process(input: BrainInput): Promise<BrainOutput> {
    const latencyTracker = new LatencyTracker();
    this.internalState.onCycleStart();

    const traceId = generateTraceId();
    const context: Partial<CognitiveContext> = {};

    try {
      this.logger.log(
        `[BrainV2] Starting cognitive cycle for session=${input.sessionId}`,
      );

      // 1. Perception
      const perceptionResult = await this.perception.perceive(input);
      context.perceptionResult = perceptionResult;

      // Governance: build ExecutionContext unconditionally, before any
      // fast-path or gated logic. This is the same principle as the
      // preferredAddress load below — identity/authorization must survive
      // fast paths (IMMEDIATE, trivial importance, code-gen) rather than
      // being gated behind ExecutiveService/ExecutionRouter. A thrown
      // error here is caught by the outer try/catch and falls through to
      // the fail-closed error response — it is not safe to proceed
      // through the rest of the cycle without a valid identity.
      const executionContext = await this.identityService.buildContext({
        id: input.userId,
        sessionId: input.sessionId,
      });

      // Attach to CognitiveContext so ExecutiveService can enforce
      // AuthorizationService.evaluateDecision() before dispatching to
      // ExecutionEngine.
      context.executionContext = executionContext;

      // 2. Working Memory Init & Seed
      const state = this.workingMemory.create(input.userId, input.sessionId);

      const userProfile = await this.usersService.findById(input.userId);

      // Standing preferences (e.g. preferred form of address) are loaded
      // unconditionally, independent of ExecutiveService/ExecutionRouter's
      // retrieveMemory gating. These are identity, not retrievable
      // context — they must survive fast paths (IMMEDIATE, trivial
      // importance, code-gen) that deliberately skip general memory
      // retrieval for performance. See: "call me Master" reverting to
      // the user's given name on short/low-importance turns.
      const standingPreferences = await this.preferenceMemory
        .retrieve({
          userId: input.userId,
          query: '', // no category filter — load all preferences
          limit: 50,
        })
        .catch((err) => {
          this.logger.warn(
            `[BrainV2] Failed to load standing preferences: ${(err as Error).message}`,
          );
          return [] as PreferenceMemoryData[];
        });

      const preferredAddressPref = standingPreferences.find(
        (p) =>
          p.category?.toLowerCase().includes('address') ||
          p.key?.toLowerCase().includes('address') ||
          p.key?.toLowerCase().includes('call'),
      );

      state.userIdentity = {
        name: userProfile?.name || 'User',
        preferredAddress: preferredAddressPref?.value,
        facts: {},
      };

      const recentMessages = await this.conversationsService.getRecentMessages(
        input.userId,
        10,
      );
      this.workingMemory.seedConversationHistory(state, recentMessages);

      // 3. Attention
      const attentionResult = this.attention.analyze(
        perceptionResult,
        state.focusStack,
      );
      context.attentionResult = attentionResult;

      this.workingMemory.applyAttention(state, attentionResult);
      this.emotion.update(input.sessionId, attentionResult.emotion);

      // 4. Executive Control & Execution
      const decision = await this.executive.process(
        context as CognitiveContext,
        state,
        latencyTracker,
      );

      // 5. Language Generation
      const startLang = Date.now();
      const languageResult = await this.language.generate(
        context as CognitiveContext,
        state,
      );
      context.languageResult = languageResult;
      latencyTracker.record(
        'LanguageGenerator',
        true,
        startLang,
        Date.now() - startLang,
      );

      // 6. Trace & Observability Assembly
      const totalLatency = latencyTracker.totalElapsed();
      this.cognitionMetrics.record(decision.executionPath, totalLatency);
      this.internalState.onCycleComplete(decision.executionPath, totalLatency);

      const trace: CognitiveTrace = {
        traceId,
        sessionId: input.sessionId,
        startedAt: new Date(Date.now() - totalLatency),
        completedAt: new Date(),
        totalLatencyMs: totalLatency,
        executionPath: decision.executionPath,
        moduleLatencies: latencyTracker.getRecords(),
        decisionRationale: decision.rationale,
        decisionConfidence: decision.confidence,
        memoryFactsRetrieved: state.retrievedFacts.length,
        reasonerActivated: decision.reason,
        plannerActivated: decision.plan,
        toolInvocations: Object.keys(state.toolOutputs).length,
        reflectionScheduled: decision.reason || decision.plan,
        learningScheduled: true,
        usedFallback: false,
      };

      // 7. Background Subsystems
      const memorySnapshot = this.workingMemory.snapshot(state);

      // Persist the interaction turn so downstream memory extraction
      // (preferences, facts, relationships, etc.) can actually run.
      // Without this, CONVERSATION_MESSAGE_CREATED never fires and
      // nothing said in chat is ever captured into structured memory.
      this.scheduler.enqueue(`SaveTurn:${traceId}`, async () => {
        try {
          await this.conversationsService.saveInteractionTurn(
            input.userId,
            input.rawInput,
            languageResult.content,
          );
        } catch (err) {
          this.logger.error(
            `[BrainV2] Failed to save interaction turn: ${(err as Error).message}`,
          );
        }
      });

      if (decision.reason || decision.plan) {
        this.scheduler.enqueue(`Reflect:${traceId}`, async () => {
          await this.reflection.reflect(
            input.sessionId,
            context.planningResult?.id || 'none',
            perceptionResult.normalizedInput,
            languageResult.content,
            memorySnapshot,
          );
        });
      }

      this.scheduler.enqueue(`Learn:${traceId}`, async () => {
        await this.learning.learn(
          input.userId,
          perceptionResult.normalizedInput,
          languageResult.content,
          memorySnapshot,
        );
      });

      // 8. Output Assembly
      this.eventEmitter.emit(BrainV2Event.RESPONSE_READY, { traceId });

      return {
        sessionId: input.sessionId,
        content: languageResult.content,
        modality: 'text',
        latencyMs: totalLatency,
        cognitiveTrace: trace,
        respondedAt: new Date(),
      };
    } catch (err) {
      this.logger.error(`[BrainV2] Unhandled error: ${(err as Error).stack}`);

      this.eventEmitter.emit(BrainV2Event.COGNITIVE_ERROR, {
        sessionId: input.sessionId,
        error: (err as Error).message,
      });

      const fallbackTrace: CognitiveTrace = {
        traceId,
        sessionId: input.sessionId,
        startedAt: new Date(),
        completedAt: new Date(),
        totalLatencyMs: 0,
        executionPath: 'IMMEDIATE',
        moduleLatencies: [],
        decisionRationale: 'Error Fallback',
        decisionConfidence: 0,
        memoryFactsRetrieved: 0,
        reasonerActivated: false,
        plannerActivated: false,
        toolInvocations: 0,
        reflectionScheduled: false,
        learningScheduled: false,
        usedFallback: true,
      };

      return {
        sessionId: input.sessionId,
        content:
          'I encountered an unexpected cognitive failure. Please try again.',
        modality: 'text',
        latencyMs: 0,
        cognitiveTrace: fallbackTrace,
        respondedAt: new Date(),
      };
    }
  }

  /**
   * Streaming variant of process(). Runs the identical pre-generation
   * pipeline (perception, identity/governance, working memory,
   * preferences, attention/emotion, ExecutiveService.process() — exactly
   * once) and, only once that succeeds, consumes
   * LanguageGenerator.generateStream(), forwarding each chunk to
   * onChunk and accumulating the full text. Post-generation side effects
   * (save turn, reflection, learning, RESPONSE_READY) run exactly once,
   * only after the stream completes successfully — never per-chunk,
   * never duplicated.
   *
   * Error contract (deliberately two-part, see design note below):
   *
   * - Failures during steps 1–4 (before any chunk has reached the
   *   caller) use the EXACT SAME fail-closed contract as process():
   *   COGNITIVE_ERROR is emitted and a graceful fallback BrainOutput is
   *   RETURNED. This preserves IdentityService's existing fail-closed
   *   behavior unchanged (req 13) — a caller of processStream() sees
   *   identical behavior to process() for identity/governance failures.
   *
   * - Failures during/after generateStream() (i.e. after onChunk may
   *   already have delivered real partial content) do NOT return a
   *   fabricated fallback BrainOutput — doing so would contradict
   *   content the caller already received. Instead: no side effects run
   *   (no save turn, no reflection/learning scheduling, no
   *   RESPONSE_READY), COGNITIVE_ERROR is emitted, and the error is
   *   RETHROWN. This matches AIController.streamChat()'s existing catch
   *   block, which already converts a thrown error into an SSE 'error'
   *   event — no controller changes are required to support this.
   */
  async processStream(
    input: BrainInput,
    onChunk: (chunk: string) => void,
  ): Promise<BrainOutput> {
    const latencyTracker = new LatencyTracker();
    this.internalState.onCycleStart();

    const traceId = generateTraceId();
    const context: Partial<CognitiveContext> = {};

    let perceptionResult!: PerceptionResult;
    let state!: WorkingMemoryState;
    let decision!: ExecutiveDecision;

    // Steps 1–4: identical pre-generation pipeline to process(). No
    // chunk has reached the caller yet, so any failure here uses the
    // same graceful fallback contract process() already uses.
    try {
      this.logger.log(
        `[BrainV2] Starting streaming cognitive cycle for session=${input.sessionId}`,
      );

      // 1. Perception
      perceptionResult = await this.perception.perceive(input);
      context.perceptionResult = perceptionResult;

      // Governance: identical to process() — built unconditionally,
      // before any fast-path/gated logic. See process() for full
      // rationale. Preserves fail-closed behavior: a thrown error here
      // falls through to the catch below and returns the same fallback
      // shape process() would return for an identity failure.
      const executionContext = await this.identityService.buildContext({
        id: input.userId,
        sessionId: input.sessionId,
      });
      context.executionContext = executionContext;

      // 2. Working Memory Init & Seed
      state = this.workingMemory.create(input.userId, input.sessionId);

      const userProfile = await this.usersService.findById(input.userId);

      const standingPreferences = await this.preferenceMemory
        .retrieve({
          userId: input.userId,
          query: '',
          limit: 50,
        })
        .catch((err) => {
          this.logger.warn(
            `[BrainV2] Failed to load standing preferences: ${(err as Error).message}`,
          );
          return [] as PreferenceMemoryData[];
        });

      const preferredAddressPref = standingPreferences.find(
        (p) =>
          p.category?.toLowerCase().includes('address') ||
          p.key?.toLowerCase().includes('address') ||
          p.key?.toLowerCase().includes('call'),
      );

      state.userIdentity = {
        name: userProfile?.name || 'User',
        preferredAddress: preferredAddressPref?.value,
        facts: {},
      };

      const recentMessages = await this.conversationsService.getRecentMessages(
        input.userId,
        10,
      );
      this.workingMemory.seedConversationHistory(state, recentMessages);

      // 3. Attention
      const attentionResult = this.attention.analyze(
        perceptionResult,
        state.focusStack,
      );
      context.attentionResult = attentionResult;

      this.workingMemory.applyAttention(state, attentionResult);
      this.emotion.update(input.sessionId, attentionResult.emotion);

      // 4. Executive Control & Execution — exactly once.
      decision = await this.executive.process(
        context as CognitiveContext,
        state,
        latencyTracker,
      );
    } catch (err) {
      this.logger.error(
        `[BrainV2] processStream pre-generation error: ${(err as Error).stack}`,
      );

      this.eventEmitter.emit(BrainV2Event.COGNITIVE_ERROR, {
        sessionId: input.sessionId,
        error: (err as Error).message,
      });

      const fallbackTrace: CognitiveTrace = {
        traceId,
        sessionId: input.sessionId,
        startedAt: new Date(),
        completedAt: new Date(),
        totalLatencyMs: 0,
        executionPath: 'IMMEDIATE',
        moduleLatencies: [],
        decisionRationale: 'Error Fallback',
        decisionConfidence: 0,
        memoryFactsRetrieved: 0,
        reasonerActivated: false,
        plannerActivated: false,
        toolInvocations: 0,
        reflectionScheduled: false,
        learningScheduled: false,
        usedFallback: true,
      };

      return {
        sessionId: input.sessionId,
        content:
          'I encountered an unexpected cognitive failure. Please try again.',
        modality: 'text',
        latencyMs: 0,
        cognitiveTrace: fallbackTrace,
        respondedAt: new Date(),
      };
    }

    // Step 5 (streaming): from here on, onChunk may deliver real
    // content to the caller before we know the overall outcome. A
    // failure past this point must not be papered over — see the
    // method-level doc comment for the full rationale.
    const startLang = Date.now();
    let accumulated = '';

    try {
      for await (const chunk of this.language.generateStream(
        context as CognitiveContext,
        state,
      )) {
        accumulated += chunk;
        onChunk(chunk);
      }
    } catch (err) {
      this.logger.error(
        `[BrainV2] processStream generation error after ${accumulated.length} chars: ${(err as Error).message}`,
      );

      this.eventEmitter.emit(BrainV2Event.COGNITIVE_ERROR, {
        sessionId: input.sessionId,
        error: (err as Error).message,
      });

      // No save turn, no reflection/learning scheduling, no
      // RESPONSE_READY — the turn did not complete successfully.
      throw err;
    }

    const languageResult: LanguageResult = {
      content: accumulated,
      styleApplied: 'CONCISE',
      isValid: true,
      usedFallback: false,
      estimatedTokens: Math.floor(accumulated.length / 4),
      generatedAt: new Date(),
      llmLatencyMs: Date.now() - startLang,
    };
    context.languageResult = languageResult;
    latencyTracker.record(
      'LanguageGenerator',
      true,
      startLang,
      Date.now() - startLang,
    );

    // 6. Trace & Observability Assembly — identical shape to process().
    const totalLatency = latencyTracker.totalElapsed();
    this.cognitionMetrics.record(decision.executionPath, totalLatency);
    this.internalState.onCycleComplete(decision.executionPath, totalLatency);

    const trace: CognitiveTrace = {
      traceId,
      sessionId: input.sessionId,
      startedAt: new Date(Date.now() - totalLatency),
      completedAt: new Date(),
      totalLatencyMs: totalLatency,
      executionPath: decision.executionPath,
      moduleLatencies: latencyTracker.getRecords(),
      decisionRationale: decision.rationale,
      decisionConfidence: decision.confidence,
      memoryFactsRetrieved: state.retrievedFacts.length,
      reasonerActivated: decision.reason,
      plannerActivated: decision.plan,
      toolInvocations: Object.keys(state.toolOutputs).length,
      reflectionScheduled: decision.reason || decision.plan,
      learningScheduled: true,
      usedFallback: false,
    };

    // 7. Background Subsystems — run exactly once, only after the
    // stream has fully and successfully completed.
    const memorySnapshot = this.workingMemory.snapshot(state);

    this.scheduler.enqueue(`SaveTurn:${traceId}`, async () => {
      try {
        await this.conversationsService.saveInteractionTurn(
          input.userId,
          input.rawInput,
          languageResult.content,
        );
      } catch (err) {
        this.logger.error(
          `[BrainV2] Failed to save interaction turn: ${(err as Error).message}`,
        );
      }
    });

    if (decision.reason || decision.plan) {
      this.scheduler.enqueue(`Reflect:${traceId}`, async () => {
        await this.reflection.reflect(
          input.sessionId,
          context.planningResult?.id || 'none',
          perceptionResult.normalizedInput,
          languageResult.content,
          memorySnapshot,
        );
      });
    }

    this.scheduler.enqueue(`Learn:${traceId}`, async () => {
      await this.learning.learn(
        input.userId,
        perceptionResult.normalizedInput,
        languageResult.content,
        memorySnapshot,
      );
    });

    // 8. Output Assembly
    this.eventEmitter.emit(BrainV2Event.RESPONSE_READY, { traceId });

    return {
      sessionId: input.sessionId,
      content: languageResult.content,
      modality: 'text',
      latencyMs: totalLatency,
      cognitiveTrace: trace,
      respondedAt: new Date(),
    };
  }
}
