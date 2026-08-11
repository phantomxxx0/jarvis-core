import { Injectable, Logger } from '@nestjs/common';
import type { WorkingMemoryState } from '../contracts/working-memory';
import { Verifier } from '../reasoning/verification';
import { InferenceService } from '../../workers/inference/services/inference.service';
import { InferenceProviderType } from '../../workers/inference/enums/provider.enum';
import { extractAndParseJson } from '../../../utils/json.util';

/**
 * ReflectionReport
 *
 * Structured outcome of a reflection pass. Currently discarded by the
 * only caller (BrainV2Service) — reflection exists today as a
 * background quality/learning signal in logs, not as a value consumed
 * elsewhere. Do not add new consumers as part of this migration.
 */
interface ReflectionReport {
  goalId: string;
  planId: string;
  success: boolean;
  expectedOutcome: string;
  actualOutcome: string;
  executionMistakes: string[];
  unnecessaryToolUsage: string[];
  missingKnowledge: string[];
  suggestedImprovements: string[];
}

/**
 * ReflectionGateway (Brain V2)
 *
 * Background-only reflection module. NEVER blocks user responses.
 * Native V2 implementation — performs a single structured LLM call via
 * InferenceService to evaluate a completed cognitive cycle. No V1
 * dependency.
 *
 * Invoked by the Scheduler after the BrainOutput is delivered.
 *
 * Fail-closed: any inference or parsing failure is logged and a
 * conservative fallback ReflectionReport is produced internally —
 * reflection failures never propagate to the caller.
 */
@Injectable()
export class ReflectionGateway {
  readonly moduleName = 'ReflectionGateway';
  private readonly logger = new Logger(ReflectionGateway.name);

  private static readonly MODEL_ID = 'llama3.1:8b';

  constructor(private readonly inferenceService: InferenceService) {}

  /** @implements ICognitiveModule */
  isReady(): boolean {
    return true;
  }

  /**
   * Reflects on a completed cognitive cycle.
   * Always called asynchronously after the response is delivered.
   *
   * @param goalId           - The goal identifier.
   * @param planId           - The plan identifier.
   * @param goal             - The original user goal.
   * @param generatedResponse - The response that was delivered.
   * @param memorySnapshot   - A snapshot of Working Memory at response time.
   * @returns void (background operation).
   */
  async reflect(
    goalId: string,
    planId: string,
    goal: string,
    generatedResponse: string,
    memorySnapshot: WorkingMemoryState,
  ): Promise<void> {
    try {
      this.logger.log(
        `[ReflectionGateway] Starting background reflection for goal=${goalId}`,
      );

      // Quality check the response — V2-native, unchanged.
      const verification = Verifier.verifyResponse(generatedResponse);

      // Build execution trace — unchanged from prior gateway behavior.
      const executionTrace = [
        `Goal: ${goal}`,
        `Response length: ${generatedResponse.length} chars`,
        `Quality score: ${verification.score}`,
        verification.issues.length > 0
          ? `Issues: ${verification.issues.join(', ')}`
          : 'No quality issues detected.',
        `Tool outputs used: ${Object.keys(memorySnapshot.toolOutputs).join(', ') || 'none'}`,
        `Memory facts retrieved: ${memorySnapshot.retrievedFacts.length}`,
      ].join('\n');

      const report = await this.runReflection(
        goalId,
        planId,
        goal,
        executionTrace,
        verification.passed,
      );

      this.logger.log(
        `[ReflectionGateway] Reflection complete for goal=${goalId} ` +
          `(actualOutcome="${report.actualOutcome.slice(0, 60)}")`,
      );
    } catch (err) {
      // Reflection failures must never propagate — they are background operations.
      this.logger.error(
        `[ReflectionGateway] Failed silently: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Native V2 reflection: analyzes an execution trace via a single LLM
   * call and produces a structured ReflectionReport. Equivalent
   * behavior to V1 ReflectionService.reflect(), reimplemented directly
   * against InferenceService. No V1 dependency.
   *
   * Fail-closed: any inference or parsing failure returns a
   * conservative fallback report rather than throwing.
   */
  private async runReflection(
    goalId: string,
    planId: string,
    expectedOutcome: string,
    executionTrace: string,
    success: boolean,
  ): Promise<ReflectionReport> {
    const prompt = `
You are the Reflection Engine. Analyze the execution trace of the completed plan.
Goal: ${expectedOutcome}
Execution Success: ${success}
Trace:
${executionTrace}

Identify:
- actualOutcome: What actually happened?
- executionMistakes: Any tools that failed, wrong assumptions, or logic errors.
- unnecessaryToolUsage: Tools that were called but provided no value.
- missingKnowledge: Information the system lacked that caused failure or delays.
- suggestedImprovements: Actionable suggestions for the next time this goal is attempted.

Respond strictly with a JSON object matching this structure. Do NOT wrap the JSON in markdown blocks (e.g. \`\`\`json). Do NOT use <think> or XML tags. Just return the raw JSON object.
{
  "actualOutcome": "...",
  "executionMistakes": ["..."],
  "unnecessaryToolUsage": ["..."],
  "missingKnowledge": ["..."],
  "suggestedImprovements": ["..."]
}
    `.trim();

    try {
      const response = await this.inferenceService.infer(
        InferenceProviderType.OLLAMA,
        {
          modelId: ReflectionGateway.MODEL_ID,
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

      const jsonString =
        typeof rawPayload === 'string'
          ? rawPayload
          : JSON.stringify(rawPayload);
      const result = extractAndParseJson<any>(jsonString);

      return {
        goalId,
        planId,
        success,
        expectedOutcome,
        actualOutcome: result.actualOutcome || 'Unknown',
        executionMistakes: result.executionMistakes || [],
        unnecessaryToolUsage: result.unnecessaryToolUsage || [],
        missingKnowledge: result.missingKnowledge || [],
        suggestedImprovements: result.suggestedImprovements || [],
      };
    } catch (error) {
      this.logger.error(
        `[ReflectionGateway] LLM reflection failed: ${(error as Error).message}`,
      );

      // Conservative fail-closed fallback — matches the fallback
      // semantics previously provided by V1 ReflectionService.
      return {
        goalId,
        planId,
        success,
        expectedOutcome,
        actualOutcome: 'Reflection failed to parse trace.',
        executionMistakes: [],
        unnecessaryToolUsage: [],
        missingKnowledge: [],
        suggestedImprovements: [],
      };
    }
  }
}
