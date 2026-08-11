import { Injectable, Logger } from '@nestjs/common';
import type { ReasoningResultV2 } from '../contracts/reasoning-result';
import { InferenceService } from '../../workers/inference/services/inference.service';
import { InferenceProviderType } from '../../workers/inference/enums/provider.enum';
import { extractAndParseJson } from '../../../utils/json.util';

/**
 * ReasoningGateway (Brain V2)
 *
 * Native V2 reasoning component. Performs a single structured LLM call
 * via InferenceService to analyze a goal against its context and
 * produce a ReasoningResultV2. No V1 dependency.
 *
 * The Executive Controller invokes this ONLY when reason=true in
 * ExecutiveDecision.
 *
 * DESIGN PRINCIPLE: The Executive decides when to reason.
 * The Reasoner executes without making decisions about its own activation.
 *
 * Fail-closed: any inference or parsing failure returns a conservative
 * fallback (HIGH risk, PARALLEL_DAG strategy, isAutonomousSafe=false) —
 * never a permissive result.
 */
@Injectable()
export class ReasoningGateway {
  readonly moduleName = 'ReasoningGateway';
  private readonly logger = new Logger(ReasoningGateway.name);

  private static readonly MODEL_ID = 'llama3.1:8b';

  constructor(private readonly inferenceService: InferenceService) {}

  /** @implements ICognitiveModule */
  isReady(): boolean {
    return true;
  }

  /**
   * Analyzes the goal and cognitive context to produce a structured
   * ReasoningResultV2 via a single LLM call.
   *
   * @param goal        - The user's goal.
   * @param contextText - Assembled context from Working Memory.
   * @returns A ReasoningResultV2.
   */
  async reason(goal: string, contextText: string): Promise<ReasoningResultV2> {
    const startTime = Date.now();
    this.logger.log(
      `[ReasoningGateway] Starting reasoning for: ${goal.slice(0, 60)}...`,
    );

    const prompt = `
You are the Reasoning Engine of a cognitive AI system.
Your job is to analyze the user's goal against the provided memory context and produce a structured reasoning assessment.

Goal:
${goal}

Memory Context:
${contextText}

Analyze the goal and determine:
- intent: A concise summary of the true intent.
- identifiedConstraints: Array of constraints based on the goal or context.
- missingInformation: Array of critical missing data required to succeed.
- estimatedComplexity: "LOW", "MEDIUM", or "HIGH".
- estimatedRisk: "LOW", "MEDIUM", "HIGH", or "CRITICAL".
- executionStrategy: "DIRECT" (conversational), "PIPELINE" (linear steps), or "PARALLEL_DAG" (complex graph of tools).
- requiresClarification: true if missingInformation is blocking execution.
- clarificationQuestions: Array of questions to ask the user if clarification is required.
- isAutonomousSafe: true if the risk is LOW or MEDIUM and there is no destructive action without explicit consent.

Respond ONLY with valid JSON matching these fields. Do NOT wrap the JSON in markdown blocks (e.g. \`\`\`json). Do NOT use <think> or XML tags. Just return the raw JSON object.
    `.trim();

    try {
      const response = await this.inferenceService.infer(
        InferenceProviderType.OLLAMA,
        {
          modelId: ReasoningGateway.MODEL_ID,
          systemPrompt: prompt,
          temperature: 0.1,
          responseFormat: 'json_object',
        },
      );

      const rawPayload = response.content;
      if (!rawPayload) {
        throw new Error(
          'Received empty or undefined response from inference provider.',
        );
      }

      const parsed = extractAndParseJson<Omit<ReasoningResultV2, 'reasonedAt'>>(
        rawPayload,
      );

      const adapted: ReasoningResultV2 = {
        intent: parsed.intent,
        identifiedConstraints: parsed.identifiedConstraints,
        missingInformation: parsed.missingInformation,
        estimatedComplexity: parsed.estimatedComplexity,
        estimatedRisk: parsed.estimatedRisk,
        executionStrategy: parsed.executionStrategy,
        requiresClarification: parsed.requiresClarification,
        clarificationQuestions: parsed.clarificationQuestions,
        isAutonomousSafe: parsed.isAutonomousSafe,
        reasonedAt: new Date(),
      };

      this.logger.log(
        `[ReasoningGateway] Complete in ${Date.now() - startTime}ms. ` +
          `strategy=${adapted.executionStrategy} risk=${adapted.estimatedRisk}`,
      );

      return adapted;
    } catch (err) {
      this.logger.error(
        `[ReasoningGateway] Reasoning failed: ${(err as Error).message}`,
      );

      // Conservative fail-closed fallback — never permissive. Matches
      // the fallback semantics previously provided by V1 ReasonerService.
      return {
        intent: goal,
        identifiedConstraints: [],
        missingInformation: [],
        estimatedComplexity: 'MEDIUM',
        estimatedRisk: 'HIGH',
        executionStrategy: 'PARALLEL_DAG',
        requiresClarification: false,
        isAutonomousSafe: false,
        reasonedAt: new Date(),
      };
    }
  }
}
