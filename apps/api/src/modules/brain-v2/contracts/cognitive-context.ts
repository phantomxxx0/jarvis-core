import type { WorkingMemoryState } from './working-memory';
import type { ExecutiveDecision } from './executive-decision';
import type { AttentionResult } from './attention-result';
import type { PerceptionResult } from './perception-result';
import type { ExecutionContext } from '../../governance/interfaces/execution-context.interface';
import type { GovernanceDenial } from '../../governance/interfaces/decision-capability.interface';

/**
 * CognitiveContext
 *
 * The fully assembled context object passed from the Executive Controller
 * into the Language Generator.
 *
 * This is everything the Language Generator needs to produce a response.
 * It should be treated as read-only by the Language Generator.
 *
 * Design note: The Language Generator should NEVER make decisions about
 * what to include. The Executive already decided. The Language Generator
 * only transforms this context into natural language.
 */
export interface CognitiveContext {
  /** The original user message, normalized. */
  userInput: string;

  /**
   * The governance ExecutionContext for this turn, built once by
   * IdentityService in BrainV2Service. Read-only downstream of Executive.
   */
  executionContext: ExecutionContext;

  /**
   * Capabilities Executive requested but AuthorizationService denied for
   * this turn, if any. Set by ExecutiveService; LanguageGenerator may
   * read this (read-only) to acknowledge a denial. Empty when nothing
   * was denied.
   */
  governanceDenials: GovernanceDenial[];

  /** The current volatile working memory state. */
  workingMemory: WorkingMemoryState;

  /** The Executive's decision for this turn. */
  executiveDecision: ExecutiveDecision;

  /** Attention signals computed for this input. */
  attentionResult: AttentionResult;

  /** The perception result for this turn. */
  perceptionResult: PerceptionResult;

  /**
   * All retrieved memory facts assembled into a single string.
   * Populated only when executiveDecision.retrieveMemory = true.
   * Empty string when memory retrieval was skipped.
   */
  memoryContext: string;

  /**
   * Reasoning analysis, if the Reasoner was activated.
   * Null when executiveDecision.reason = false.
   */
  reasoningResult?: import('./reasoning-result').ReasoningResultV2;

  /**
   * Planning analysis, if the Planner was activated.
   * Null when executiveDecision.plan = false.
   */
  planningResult?: import('./planning-result').PlanningResultV2;

  /**
   * Language result from the generator.
   */
  languageResult?: import('./language-result').LanguageResult;

  /**
   * Tool/skill outputs assembled into a readable format.
   * Null when no tools were invoked.
   */
  toolContext: string | null;

  /** Wall-clock time the cognitive context was assembled. */
  assembledAt: Date;
}
