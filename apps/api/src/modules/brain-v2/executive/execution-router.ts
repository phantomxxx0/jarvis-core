import { Injectable, Logger } from '@nestjs/common';
import type { AttentionResult } from '../contracts/attention-result';
import type {
  ExecutiveDecision,
  ExecutionPath,
} from '../contracts/executive-decision';
import { DEFAULT_ROUTING_RULES, type RoutingRule } from '../config/routing';
import { COGNITIVE_THRESHOLDS } from '../config/thresholds';

/**
 * ExecutionRouter
 *
 * Evaluates the declarative routing table to map an AttentionResult
 * to a specific cognitive ExecutionPath.
 *
 * This is the core routing logic of the Executive Controller.
 */
@Injectable()
export class ExecutionRouter {
  private readonly logger = new Logger(ExecutionRouter.name);
  private readonly rules: RoutingRule[];

  constructor() {
    // Phase 1: Load static default rules.
    // Phase 2: Could load from a database or configuration service.
    this.rules = [...DEFAULT_ROUTING_RULES].sort(
      (a, b) => a.priority - b.priority,
    );
  }

  /**
   * Routes an AttentionResult to an ExecutiveDecision.
   *
   * @param attention - The AttentionResult to route.
   * @returns An ExecutiveDecision describing the required execution path.
   */
  route(attention: AttentionResult, normalizedInput = ''): ExecutiveDecision {
    const { intent, intentConfidence, importance } = attention;
    const normalizedInputText = normalizedInput.toLowerCase().trim();

    // Fast-path: Low confidence falls back to conservative memory retrieval immediately.
    if (intentConfidence < COGNITIVE_THRESHOLDS.LOW_CONFIDENCE_THRESHOLD) {
      this.logger.debug(
        `[ExecutionRouter] Low intent confidence (${intentConfidence.toFixed(2)}). Routing to MEMORY_RETRIEVAL.`,
      );
      return this.buildDecision(
        'MEMORY_RETRIEVAL',
        true,
        false,
        false,
        false,
        'Low confidence fallback',
        intentConfidence,
      );
    }

    // Fast-path: Trivial importance skips heavy modules.
    if (importance < COGNITIVE_THRESHOLDS.TRIVIAL_IMPORTANCE_MAX) {
      this.logger.debug(
        `[ExecutionRouter] Trivial importance (${importance}). Routing to IMMEDIATE.`,
      );
      return this.buildDecision(
        'IMMEDIATE',
        false,
        false,
        false,
        false,
        'Trivial importance',
        intentConfidence,
      );
    }

    // Fast-path: simple arithmetic expressions should respond immediately —
    // no memory, reasoning, or planning needed regardless of how intent was classified.
    if (this.looksLikeSimpleArithmetic(normalizedInputText)) {
      this.logger.debug(
        `[ExecutionRouter] Simple arithmetic detected. Routing to IMMEDIATE.`,
      );
      return this.buildDecision(
        'IMMEDIATE',
        false,
        false,
        false,
        false,
        'Simple arithmetic expression',
        intentConfidence,
      );
    }

    // Fast-path: personal preference / identity questions should use memory retrieval.
    if (this.looksLikePersonalMemoryQuery(attention, normalizedInputText)) {
      this.logger.debug(
        `[ExecutionRouter] Personal memory query detected. Routing to MEMORY_RETRIEVAL.`,
      );
      return this.buildDecision(
        'MEMORY_RETRIEVAL',
        true,
        false,
        false,
        false,
        'Personal memory query',
        intentConfidence,
      );
    }

    // Fast-path: code-generation commands with no personal context should skip memory retrieval.
    // (Checked before the generic TECHNICAL fast-path so a code-generation
    // request with high importance is not intercepted by it.)
    if (this.looksLikeCodeGenerationRequest(attention, normalizedInputText)) {
      this.logger.debug(
        `[ExecutionRouter] Code generation request detected. Skipping memory retrieval.`,
      );
      return this.buildDecision(
        'PLANNING',
        false,
        true,
        true,
        true,
        'Code generation without personal context',
        intentConfidence,
      );
    }

    // Fast-path: technical questions should trigger reasoning.
    if (
      this.looksLikeTechnicalQuestion(attention, normalizedInputText) &&
      importance >= COGNITIVE_THRESHOLDS.REASONING_IMPORTANCE_MIN
    ) {
      this.logger.debug(
        `[ExecutionRouter] Technical question detected. Routing to REASONING.`,
      );
      return this.buildDecision(
        'REASONING',
        true,
        true,
        false,
        false,
        'Technical question',
        intentConfidence,
      );
    }

    // Evaluate declarative routing rules in priority order.
    for (const rule of this.rules) {
      if (this.matchesRule(attention, rule)) {
        this.logger.debug(
          `[ExecutionRouter] Matched rule: "${rule.name}". Path: ${rule.executionPath}.`,
        );
        return this.buildDecision(
          rule.executionPath,
          rule.retrieveMemory,
          rule.reason,
          rule.plan,
          rule.useTool,
          `Matched rule: ${rule.name}`,
          intentConfidence,
        );
      }
    }

    // Ultimate fallback if no rules match. Should rarely hit due to UNKNOWN rule.
    this.logger.warn(
      `[ExecutionRouter] No routing rule matched intent=${intent} importance=${importance}. Falling back to MEMORY_RETRIEVAL.`,
    );
    return this.buildDecision(
      'MEMORY_RETRIEVAL',
      true,
      false,
      false,
      false,
      'No rule matched fallback',
      intentConfidence,
    );
  }

  /**
   * Heuristic check for simple arithmetic expressions that need no cognitive
   * overhead — e.g. "what is 12 * 7", "2+2", "calculate 45 / 9".
   * Deliberately narrow: requires digits and an operator, so it won't
   * misfire on genuine research or word-based math questions.
   */
  private looksLikeSimpleArithmetic(normalizedInput: string): boolean {
    const stripped = normalizedInput
      .replace(/^(what'?s|what\s+is|calculate|compute|solve)\s+/i, '')
      .replace(/\?$/, '')
      .trim();

    return /^-?\d+(\.\d+)?\s*[+\-*/x×÷]\s*-?\d+(\.\d+)?(\s*[+\-*/x×÷]\s*-?\d+(\.\d+)?)*$/.test(
      stripped,
    );
  }

  /**
   * Heuristic check for personal questions that should consult long-term memory.
   */
  private looksLikePersonalMemoryQuery(
    attention: AttentionResult,
    normalizedInput: string,
  ): boolean {
    if (
      attention.intent !== 'QUESTION' &&
      attention.intent !== 'CLARIFICATION'
    ) {
      return false;
    }

    const topicText = attention.topicTags.join(' ').toLowerCase();
    const hasPersonalPronoun = /\b(my|mine|me|i|myself|we|our|us)\b/i.test(
      normalizedInput,
    );
    const hasPersonalMarker =
      /\b(name|favorite|favourite|preference|prefer|birthday|address|hobby|music|movie|food|colour|color|pet|family|friend|brother|sister|mother|father|relationship|goal|home|call|called|nickname|nick)\b/i.test(
        normalizedInput,
      );
    const hasIdentityPhrase =
      /\b(who\s+am\s+i|what\s+do\s+you\s+call\s+me|what\s+is\s+my\s+name|what\s+is\s+my\s+favorite|what\s+is\s+my\s+favourite)\b/i.test(
        normalizedInput,
      );

    return (
      (hasPersonalPronoun && hasPersonalMarker) ||
      hasIdentityPhrase ||
      /\b(who\s+is\s+my|who\s+am\s+i|what\s+do\s+you\s+call\s+me)\b/i.test(
        normalizedInput,
      )
    );
  }

  /**
   * Heuristic check for technical questions that should trigger reasoning.
   */
  private looksLikeTechnicalQuestion(
    attention: AttentionResult,
    normalizedInput: string,
  ): boolean {
    if (attention.intent === 'TECHNICAL') {
      return true;
    }

    return /\b(code|function|class|method|bug|error|exception|typescript|javascript|python|rust|api|endpoint|database|query|algorithm|implement|refactor|debug|compile|deploy|docker|kubernetes|git|npm|pnpm)\b/i.test(
      normalizedInput,
    );
  }

  /**
   * Heuristic check for code-writing commands that don't need personal memory context.
   */
  private looksLikeCodeGenerationRequest(
    attention: AttentionResult,
    normalizedInput: string,
  ): boolean {
    if (attention.intent !== 'COMMAND' && attention.intent !== 'TECHNICAL') {
      return false;
    }

    // Don't skip memory if the request also references personal context —
    // that combination should still consult memory.
    if (this.looksLikePersonalMemoryQuery(attention, normalizedInput)) {
      return false;
    }

    const isCodeWritingVerb =
      /\b(write|create|build|generate|make|implement|refactor|fix|add)\b/i.test(
        normalizedInput,
      );
    const isCodeArtifact =
      /\b(script|function|class|program|code|app|calculator|component|module|algorithm|snippet|cli|api|endpoint)\b/i.test(
        normalizedInput,
      );

    return isCodeWritingVerb && isCodeArtifact;
  }

  /**
   * Checks if an AttentionResult matches a RoutingRule.
   */
  private matchesRule(attention: AttentionResult, rule: RoutingRule): boolean {
    const intentMatch =
      rule.matchIntent.length === 0 ||
      rule.matchIntent.includes(attention.intent);
    if (!intentMatch) return false;

    if (
      rule.minImportance !== undefined &&
      attention.importance < rule.minImportance
    ) {
      return false;
    }

    if (
      rule.maxImportance !== undefined &&
      attention.importance > rule.maxImportance
    ) {
      return false;
    }

    return true;
  }

  /**
   * Helper to construct an ExecutiveDecision.
   */
  private buildDecision(
    executionPath: ExecutionPath,
    retrieveMemory: boolean,
    reason: boolean,
    plan: boolean,
    useTool: boolean,
    rationale: string,
    confidence: number,
  ): ExecutiveDecision {
    return {
      executionPath,
      retrieveMemory,
      reason,
      plan,
      useTool,
      rationale,
      confidence,
      respondImmediately: executionPath === 'IMMEDIATE',
      runReflectionAsync: reason || plan,
      runLearningAsync: true,
      latencyBudgetMs: executionPath === 'IMMEDIATE' ? 500 : 2000,
      decidedAt: new Date(),
    };
  }
}
