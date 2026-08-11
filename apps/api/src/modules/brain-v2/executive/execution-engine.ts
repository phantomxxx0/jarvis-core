import { Injectable, Logger } from '@nestjs/common';
import type { ExecutiveDecision } from '../contracts/executive-decision';
import type { CognitiveContext } from '../contracts/cognitive-context';
import type { WorkingMemoryState } from '../contracts/working-memory';
import type { ExecutionContext } from '../../governance/interfaces/execution-context.interface';
import { MemoryGateway } from '../memory/memory-gateway';
import { ReasoningGateway } from '../reasoning/reasoning.service';
import { PlanningGateway } from '../planning/planning.service';
import { ToolRouter } from '../skills/tool-router';
import { WorkingMemoryService } from '../working-memory/working-memory.service';
import { LatencyTracker } from '../metrics/latency';

/**
 * ExecutionEngine
 *
 * Drives the execution of the selected cognitive path based on
 * the ExecutiveDecision. Coordinates the sequential/parallel invocation
 * of downstream cognitive modules (Memory, Reasoning, Planning, Skills).
 *
 * This represents the "Execution" phase of the brain's main loop.
 */
@Injectable()
export class ExecutionEngine {
  private readonly logger = new Logger(ExecutionEngine.name);

  constructor(
    private readonly memoryGateway: MemoryGateway,
    private readonly reasoningGateway: ReasoningGateway,
    private readonly planningGateway: PlanningGateway,
    private readonly toolRouter: ToolRouter,
    private readonly workingMemory: WorkingMemoryService,
  ) {}

  /**
   * Executes the cognitive pipeline as directed by the ExecutiveDecision.
   * Modifies the CognitiveContext in-place as modules complete.
   *
   * @param decision - The ExecutiveDecision containing routing flags.
   * @param context  - The active CognitiveContext.
   * @param state    - The active WorkingMemoryState.
   * @param latency  - The per-request latency tracker.
   */
  async execute(
    decision: ExecutiveDecision,
    context: CognitiveContext,
    state: WorkingMemoryState,
    latency: LatencyTracker,
  ): Promise<void> {
    const { perceptionResult, attentionResult } = context;
    const goal = perceptionResult.normalizedInput;

    this.logger.debug(
      `[ExecutionEngine] path=${decision.executionPath} retrieveMemory=${decision.retrieveMemory} reason=${decision.reason} plan=${decision.plan}`,
    );

    // 1. Memory Retrieval (if activated)
    if (decision.retrieveMemory) {
      const start = Date.now();
      try {
        const memoryContext = await this.memoryGateway.retrieve(
          state.userId,
          goal,
          attentionResult,
        );
        context.memoryContext = memoryContext;
        this.logger.debug(
          `[ExecutionEngine] Retrieved ${memoryContext.length} chars of memory context.`,
        );
        // Also load into working memory state for potential skills to use.
        this.workingMemory.setRetrievedFacts(state, [memoryContext]);
      } finally {
        latency.record('MemoryGateway', true, start, Date.now() - start);
      }
    } else {
      latency.record('MemoryGateway', false, Date.now(), 0);
    }

    // 2. Reasoning (if activated)
    if (decision.reason) {
      const start = Date.now();
      try {
        // Reasoner uses the conversation history and retrieved memory as context.
        const contextText = [
          state.conversationHistory
            .map((m) => `${m.role}: ${m.content}`)
            .join('\n'),
          context.memoryContext || '',
        ].join('\n\n');

        const reasoningResult = await this.reasoningGateway.reason(
          goal,
          contextText,
        );
        context.reasoningResult = reasoningResult;
      } finally {
        latency.record('ReasoningGateway', true, start, Date.now() - start);
      }
    } else {
      latency.record('ReasoningGateway', false, Date.now(), 0);
    }

    // 3. Planning (if activated)
    if (decision.plan) {
      const start = Date.now();
      try {
        const contextText = context.reasoningResult
          ? JSON.stringify(context.reasoningResult)
          : '';

        const planningResult = await this.planningGateway.plan(
          goal,
          decision.useTool,
        );
        context.planningResult = planningResult;

        // 4. Execution of Plan Steps (Skills)
        if (decision.useTool) {
          await this.executePlanSteps(
            planningResult,
            goal,
            state,
            latency,
            context.executionContext,
          );
        }
      } finally {
        latency.record('PlanningGateway', true, start, Date.now() - start);
      }
    } else {
      latency.record('PlanningGateway', false, Date.now(), 0);
      latency.record('SkillRouter', false, Date.now(), 0);
    }
  }

  /**
   * Executes the steps defined in the PlanningResult.
   * Phase 1: Only executes 'skill' steps synchronously.
   *
   * ExecutionContext is passed through unchanged to ToolRouter — this
   * method makes no authorization decisions itself; ToolRouter checks
   * each tool's requiredPermission before invoking it.
   */
  private async executePlanSteps(
    plan: import('../contracts/planning-result').PlanningResultV2,
    goal: string,
    state: WorkingMemoryState,
    latency: LatencyTracker,
    executionContext: ExecutionContext,
  ): Promise<void> {
    for (const step of plan.steps) {
      if (step.type === 'skill' && step.skillName) {
        const start = Date.now();
        try {
          const result = await this.toolRouter.invoke(
            step.skillName,
            step.input,
            executionContext,
          );
          this.workingMemory.setToolOutput(
            state,
            step.skillName,
            result.output,
          );
        } finally {
          latency.record(
            `Skill:${step.skillName}`,
            true,
            start,
            Date.now() - start,
          );
        }
      }
    }
  }
}
