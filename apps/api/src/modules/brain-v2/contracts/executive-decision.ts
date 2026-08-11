/**
 * ExecutionPath
 *
 * Named execution paths that the Executive Controller may activate.
 * Each path has an associated latency target and cognitive cost.
 */
export type ExecutionPath =
  | 'IMMEDIATE' // No retrieval, no reasoning — pure language generation
  | 'MEMORY_RETRIEVAL' // Retrieve from long-term memory, then generate
  | 'REASONING' // Activate ReasonerService
  | 'PLANNING' // Activate PlannerService (implies reasoning first)
  | 'TOOL_USE' // Activate skill/tool system
  | 'FULL_COGNITIVE'; // All systems — complex autonomous tasks

/**
 * ExecutiveDecision
 *
 * The output of the Executive Controller. This single object drives the
 * entire cognitive pipeline for a given request.
 *
 * The Executive is the most critical module in Brain V2.
 * It is the only component that decides what happens next.
 *
 * Design constraint: The decision must be computed without an LLM call
 * in Phase 1. Speed is the primary objective here.
 *
 * Target decision latency: < 5ms (rule-based, Phase 1)
 */
export interface ExecutiveDecision {
  /**
   * Which named execution path was selected.
   * Drives the ExecutionRouter's behavior.
   */
  executionPath: ExecutionPath;

  /**
   * Should long-term memory be retrieved before language generation?
   * True for personal questions, contextual tasks, memory-dependent responses.
   */
  retrieveMemory: boolean;

  /**
   * Should the Reasoner be activated?
   * True only for complex technical tasks, multi-step problems.
   */
  reason: boolean;

  /**
   * Should the Planner be activated?
   * True only when a plan with multiple steps is needed.
   * Always implies reason=true.
   */
  plan: boolean;

  /**
   * Should a tool or skill be invoked?
   * True for code execution, web search, shell commands, etc.
   */
  useTool: boolean;

  /**
   * Should the Language Generator respond immediately?
   * True for greetings, farewells, simple acknowledgements.
   * When true, reason/plan/useTool must all be false.
   */
  respondImmediately: boolean;

  /**
   * Should the Reflection module run after the response is sent?
   * Always true for REASONING and FULL_COGNITIVE paths.
   * Never runs before response is delivered (async only).
   */
  runReflectionAsync: boolean;

  /**
   * Should the Learning module run after the response is sent?
   * Always true for REASONING and FULL_COGNITIVE paths.
   * Never runs before response is delivered (async only).
   */
  runLearningAsync: boolean;

  /**
   * Executive's confidence in this decision (0.0 – 1.0).
   * Derived from AttentionResult.intentConfidence.
   * Low confidence may cause the Language Generator to hedge.
   */
  confidence: number;

  /**
   * Human-readable rationale for this decision.
   * Stored in CognitiveTrace for observability and self-improvement.
   */
  rationale: string;

  /**
   * Latency budget in milliseconds for this execution path.
   * ExecutionRouter enforces this as a soft timeout.
   */
  latencyBudgetMs: number;

  /** Wall-clock time the Executive completed its decision. */
  decidedAt: Date;
}
