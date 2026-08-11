import { Injectable } from '@nestjs/common';
import type { PerceptionResult } from '../contracts/perception-result';
import type { IntentClass } from '../contracts/attention-result';

/**
 * IntentDetector
 *
 * Classifies the high-level intent of a normalized input.
 *
 * Phase 1: Rule-based heuristics. Fast. Zero LLM calls.
 * Phase 2: Optional LLM-enhanced classification via feature flag.
 *
 * Heuristics are applied in priority order. The first matching
 * pattern wins. Unknown intent is the safe fallback.
 *
 * DESIGN NOTE — domain vocabulary vs. problem vocabulary:
 * Technical *subject* words (docker, kubernetes, typescript, python, ...)
 * only describe what the user is talking ABOUT. They do not by themselves
 * indicate the user has a technical PROBLEM — "How does Docker networking
 * work?" is a general QUESTION, not a debugging request. Only genuine
 * problem/implementation signals (error, bug, crash, debug, fix, throw,
 * ...), an explicit code block, or an explicit code-generation request
 * force TECHNICAL. Keeping these two vocabularies separate — rather than
 * one overloaded keyword list — is what lets the classifier represent
 * PRIMARY INTENT rather than merely topic.
 */
@Injectable()
export class IntentDetector {
  private readonly GREETING_PATTERNS = [
    /^(hi|hello|hey|good\s+(morning|afternoon|evening|night)|howdy|greetings|sup|what'?s\s+up|yo)\b/i,
    /^(hiya|helo|heya|morning|evening|afternoon)\b/i,
  ];

  private readonly FAREWELL_PATTERNS = [
    /^(bye|goodbye|see\s+you|later|good\s+night|take\s+care|cya|ttyl|farewell)\b/i,
  ];

  private readonly EMOTIONAL_SIGNALS = [
    /\b(feeling|feel|sad|happy|anxious|worried|stressed|excited|angry|frustrated|overwhelmed|lonely|depressed|grateful|miss\s+you|love|hate|scared)\b/i,
  ];

  private readonly RESEARCH_SIGNALS = [
    /^(research|search|investigate|look\s+up)\b/i,
    /\b(research|search|investigate|look\s+up)\s+(for|the|this|that|information|details)\b/i,
  ];

  private readonly COMMAND_PATTERNS = [
    /^(run|execute|create|build|generate|delete|update|install|start|stop|restart|deploy|open|close|write|send|set)\b/i,
  ];

  private readonly QUESTION_PATTERNS = [
    /^(what|who|where|when|why|how|which|is|are|was|were|will|can|should|could|would|do|does|did)\b/i,
    /^(explain|describe|tell\s+me)\b/i,
    /\?$/,
  ];

  private readonly CREATIVE_SIGNALS = [
    /\b(write|compose|create|story|poem|novel|song|lyric|brainstorm|idea|imagine|fiction|creative|design|concept)\b/i,
  ];

  /**
   * Verbs indicating the user wants something written/built. Used
   * together with CODE_ARTIFACT_TERMS to detect code-generation
   * requests specifically — these stay TECHNICAL even though they start
   * with a command verb, matching ExecutionRouter's dedicated PLANNING
   * path for code generation.
   */
  private readonly CODE_WRITING_VERBS =
    /\b(write|create|build|generate|make|implement|refactor|fix|add)\b/i;

  /** Nouns naming a code artifact the user wants produced or changed. */
  private readonly CODE_ARTIFACT_TERMS =
    /\b(script|function|class|program|code|app|calculator|component|module|algorithm|snippet|cli|api|endpoint|service)\b/i;

  /**
   * Genuine technical PROBLEM/implementation signals — distinct from
   * domain/topic vocabulary (see class doc). These indicate the user is
   * describing something broken, failing, or in need of debugging or
   * implementation work, and force TECHNICAL regardless of sentence
   * form: "Why does ... throw an error?" is exactly as TECHNICAL as
   * "Debug this error." Domain-only words (docker, kubernetes,
   * typescript, api, database, function, ...) are deliberately absent
   * from this list — mentioning a technology or programming concept is
   * not itself a problem signal.
   */
  private readonly TECHNICAL_PROBLEM_SIGNALS = [
    /\b(bugs?|errors?|exceptions?|crash(?:es|ing)?|fail(?:s|ing|ure)?|broken|debug(?:ging)?|refactor(?:ing)?|implement(?:ing)?|fix(?:es|ing)?|throws?|throwing|wrong|compil(?:e|es|ing|ation))\b/i,
    /\b(not\s+working|doesn'?t\s+work|isn'?t\s+working)\b/i,
    /stack\s*trace/i,
  ];

  /**
   * Classifies the intent of a normalized input.
   *
   * @param perception - The PerceptionResult from the Perception Layer.
   * @returns The classified IntentClass and a confidence score.
   */
  detect(perception: PerceptionResult): {
    intent: IntentClass;
    confidence: number;
  } {
    const text = perception.normalizedInput.toLowerCase().trim();

    // Priority 1: Greeting
    if (this.GREETING_PATTERNS.some((p) => p.test(text))) {
      return { intent: 'GREETING', confidence: 0.92 };
    }

    // Priority 2: Farewell
    if (this.FAREWELL_PATTERNS.some((p) => p.test(text))) {
      return { intent: 'FAREWELL', confidence: 0.92 };
    }

    // Priority 3: Emotional support
    if (this.EMOTIONAL_SIGNALS.some((p) => p.test(text))) {
      return { intent: 'EMOTIONAL', confidence: 0.78 };
    }

    /*
     * Priority 4: Explicit research/lookup requests beat everything
     * below — the user's primary intent is retrieval, even if the
     * sentence also contains technical vocabulary ("Look up the
     * current Docker documentation").
     */
    if (this.RESEARCH_SIGNALS.some((p) => p.test(text))) {
      return { intent: 'RESEARCH', confidence: 0.8 };
    }

    const isCommand = this.COMMAND_PATTERNS.some((p) => p.test(text));
    const hasCodeBlock = perception.codeBlocks.length > 0;

    /*
     * Code-generation requests are deliberately kept TECHNICAL rather
     * than COMMAND — ExecutionRouter has a dedicated code-generation
     * path that routes these to PLANNING without pulling memory.
     */
    const isCodeGenerationRequest =
      isCommand &&
      this.CODE_WRITING_VERBS.test(text) &&
      this.CODE_ARTIFACT_TERMS.test(text);

    /*
     * Priority 5: Explicit action commands that are NOT code-generation.
     * "Run the database migration" contains "database", but the user's
     * primary intent is to perform an action, so COMMAND wins.
     */
    if (isCommand && !isCodeGenerationRequest) {
      return { intent: 'COMMAND', confidence: 0.82 };
    }

    // Priority 6: Code blocks are an unambiguous technical signal.
    if (hasCodeBlock) {
      return { intent: 'TECHNICAL', confidence: 0.95 };
    }

    // Priority 7: Code-generation / implementation requests.
    if (isCodeGenerationRequest) {
      return { intent: 'TECHNICAL', confidence: 0.8 };
    }

    /*
     * Priority 8: Genuine technical problem/debugging language forces
     * TECHNICAL regardless of sentence form — including questions like
     * "Why does this TypeScript function throw an error?" or "How do I
     * fix this API returning HTTP 500?". Domain-only vocabulary (docker,
     * kubernetes, typescript, api, database, ...) is deliberately absent
     * from TECHNICAL_PROBLEM_SIGNALS, so a purely topical question like
     * "How does Docker networking work?" correctly falls through to
     * QUESTION below instead of being caught here.
     */
    if (this.TECHNICAL_PROBLEM_SIGNALS.some((p) => p.test(text))) {
      return { intent: 'TECHNICAL', confidence: 0.8 };
    }

    /*
     * Priority 9: Generic questions — including ones about technical
     * subjects, as long as no problem/debugging signal was present
     * above ("What is JWT?", "How does Docker networking work?",
     * "Tell me about Kubernetes.").
     */
    if (this.QUESTION_PATTERNS.some((p) => p.test(text))) {
      return { intent: 'QUESTION', confidence: 0.65 };
    }

    // Priority 10: Creative requests.
    if (this.CREATIVE_SIGNALS.some((p) => p.test(text))) {
      return { intent: 'CREATIVE', confidence: 0.7 };
    }

    // Fallback.
    return { intent: 'UNKNOWN', confidence: 0.3 };
  }
}
