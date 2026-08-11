import { Injectable, Logger } from '@nestjs/common';
import { ReflectionReport } from './contracts/reflection-report';
import { InferenceService } from '../../workers/inference/services/inference.service';
import { InferenceProviderType } from '../../workers/inference/enums/provider.enum';
import { extractAndParseJson } from '../../../utils/json.util';

@Injectable()
export class ReflectionService {
  private readonly logger = new Logger(ReflectionService.name);

  constructor(private readonly inferenceService: InferenceService) {}

  /**
   * Evaluates the execution outcome against the expected outcome.
   * Does NOT update memory directly.
   */
  public async reflect(
    goalId: string,
    planId: string,
    expectedOutcome: string,
    executionTrace: string,
    success: boolean,
  ): Promise<ReflectionReport> {
    this.logger.log(`Starting reflection for Goal ${goalId}`);

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
          modelId: 'llama3.1:8b',
          systemPrompt: prompt,
          temperature: 0.1,
          responseFormat: 'json_object',
        },
      );

      // PATCH: Safe JSON Extraction
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
      this.logger.error(`Reflection failed: ${(error as Error).message}`);
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
