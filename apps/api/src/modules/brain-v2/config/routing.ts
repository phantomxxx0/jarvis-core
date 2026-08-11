import type { IntentClass } from '../contracts/attention-result';
import type { ExecutionPath } from '../contracts/executive-decision';

/**
 * RoutingRule
 *
 * A single declarative routing rule evaluated by the Executive Controller.
 * Rules are evaluated in priority order (lower number = evaluated first).
 * The first matching rule wins.
 */
export interface RoutingRule {
  /** Display name for logging and debugging. */
  name: string;

  /** Rules with lower priority numbers are evaluated first. */
  priority: number;

  /** Intent classes this rule matches. Empty array = match any. */
  matchIntent: IntentClass[];

  /**
   * Maximum importance score for this rule to apply.
   * If input importance exceeds this, this rule is skipped.
   * Undefined = no upper bound.
   */
  maxImportance?: number;

  /**
   * Minimum importance score for this rule to apply.
   * If input importance is below this, this rule is skipped.
   * Undefined = no lower bound.
   */
  minImportance?: number;

  /** The execution path this rule prescribes when matched. */
  executionPath: ExecutionPath;

  /** Whether memory retrieval is activated by this rule. */
  retrieveMemory: boolean;

  /** Whether the Reasoner is activated by this rule. */
  reason: boolean;

  /** Whether the Planner is activated by this rule. */
  plan: boolean;

  /** Whether a tool/skill is invoked by this rule. */
  useTool: boolean;

  /** Whether the response is produced immediately (no heavy modules). */
  respondImmediately: boolean;

  /** Whether Reflection is scheduled async after response. */
  runReflectionAsync: boolean;

  /** Whether Learning is scheduled async after response. */
  runLearningAsync: boolean;
}

/**
 * DEFAULT_ROUTING_RULES
 *
 * The canonical routing table for Brain V2's Executive Controller.
 * Rules are evaluated top-to-bottom (lowest priority number first).
 *
 * This table encodes the performance targets from the spec:
 *   GREETING          → <500ms
 *   MEMORY_RETRIEVAL  → <1s
 *   REASONING         → <5s
 *   FULL_COGNITIVE    → 10–30s
 */
export const DEFAULT_ROUTING_RULES: RoutingRule[] = [
  {
    name: 'Greeting — immediate response',
    priority: 10,
    matchIntent: ['GREETING', 'FAREWELL'],
    executionPath: 'IMMEDIATE',
    retrieveMemory: false,
    reason: false,
    plan: false,
    useTool: false,
    respondImmediately: true,
    runReflectionAsync: false,
    runLearningAsync: false,
  },
  {
    name: 'Emotional support — memory + empathy',
    priority: 20,
    matchIntent: ['EMOTIONAL'],
    executionPath: 'MEMORY_RETRIEVAL',
    retrieveMemory: true,
    reason: false,
    plan: false,
    useTool: false,
    respondImmediately: false,
    runReflectionAsync: false,
    runLearningAsync: true,
  },
  {
    name: 'Personal question — memory retrieval',
    priority: 30,
    matchIntent: ['QUESTION', 'CLARIFICATION'],
    maxImportance: 59,
    executionPath: 'MEMORY_RETRIEVAL',
    retrieveMemory: true,
    reason: false,
    plan: false,
    useTool: false,
    respondImmediately: false,
    runReflectionAsync: false,
    runLearningAsync: false,
  },
  {
    name: 'Technical intent — always reason',
    priority: 35,
    matchIntent: ['TECHNICAL'],
    executionPath: 'REASONING',
    retrieveMemory: true,
    reason: true,
    plan: false,
    useTool: false,
    respondImmediately: false,
    runReflectionAsync: true,
    runLearningAsync: true,
  },
  {
    name: 'Technical question — reason then respond',
    priority: 40,
    matchIntent: ['QUESTION'],
    minImportance: 60,
    executionPath: 'REASONING',
    retrieveMemory: true,
    reason: true,
    plan: false,
    useTool: false,
    respondImmediately: false,
    runReflectionAsync: true,
    runLearningAsync: true,
  },
  {
    name: 'Command — plan and execute',
    priority: 50,
    matchIntent: ['COMMAND'],
    executionPath: 'PLANNING',
    retrieveMemory: true,
    reason: true,
    plan: true,
    useTool: true,
    respondImmediately: false,
    runReflectionAsync: true,
    runLearningAsync: true,
  },
  {
    name: 'Research — full cognitive pipeline',
    priority: 60,
    matchIntent: ['RESEARCH'],
    executionPath: 'FULL_COGNITIVE',
    retrieveMemory: true,
    reason: true,
    plan: true,
    useTool: true,
    respondImmediately: false,
    runReflectionAsync: true,
    runLearningAsync: true,
  },
  {
    name: 'Creative — memory + direct generation',
    priority: 70,
    matchIntent: ['CREATIVE'],
    executionPath: 'MEMORY_RETRIEVAL',
    retrieveMemory: true,
    reason: false,
    plan: false,
    useTool: false,
    respondImmediately: false,
    runReflectionAsync: false,
    runLearningAsync: false,
  },
  {
    name: 'Unknown — conservative memory retrieval',
    priority: 999,
    matchIntent: ['UNKNOWN', 'SYSTEM'],
    executionPath: 'MEMORY_RETRIEVAL',
    retrieveMemory: true,
    reason: false,
    plan: false,
    useTool: false,
    respondImmediately: false,
    runReflectionAsync: false,
    runLearningAsync: false,
  },
];
