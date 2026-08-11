import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ReasoningResult } from './contracts/reasoning-result';
import { InferenceService } from '../../workers/inference/services/inference.service';
import { InferenceProviderType } from '../../workers/inference/enums/provider.enum';
import { BrainPlan } from '../planner/contracts/brain-plan';
import { BrainPlanStep } from '../planner/contracts/brain-plan-step';
import { ToolRegistryService } from '../../tools/tool-registry.service';
import { extractAndParseJson } from '../../../utils/json.util';

export type PlanRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ValidatedBrainPlan extends Omit<
  BrainPlan,
  'status' | 'steps'
> {
  status: 'VALIDATED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  steps: BrainPlanStep[];
  approval?: {
    requiresApproval: boolean;
    approvalReason?: string;
  };
}

@Injectable()
export class ReasonerService {
  private readonly logger = new Logger(ReasonerService.name);

  constructor(
    private readonly inferenceService: InferenceService,
    private readonly toolRegistry: ToolRegistryService,
  ) {}

  /**
   * Analyzes the goal and the cognitive context to produce a structured ReasoningResult.
   * This does NOT execute tools or modify memory.
   */
  public async reason(
    goal: string,
    contextText: string,
  ): Promise<ReasoningResult> {
    this.logger.log(
      `Starting advanced reasoning for goal: ${goal.substring(0, 50)}...`,
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

Respond ONLY with valid JSON matching the ReasoningResult interface. Do NOT wrap the JSON in markdown blocks (e.g. \`\`\`json). Do NOT use <think> or XML tags. Just return the raw JSON object.
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
      // SAFE JSON EXTRACTION PATCH
      const rawPayload = response.content;
      if (!rawPayload) {
        throw new Error(
          'Received empty or undefined response from inference provider.',
        );
      }

      const result = extractAndParseJson<ReasoningResult>(
        typeof rawPayload === 'string'
          ? rawPayload
          : JSON.stringify(rawPayload),
      );

      this.logger.debug(
        `Reasoning complete. Strategy: ${result.executionStrategy}, Risk: ${result.estimatedRisk}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Reasoning failed: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Fallback safe reasoning
      return {
        intent: goal,
        identifiedConstraints: [],
        missingInformation: [],
        estimatedComplexity: 'MEDIUM',
        estimatedRisk: 'HIGH',
        executionStrategy: 'PARALLEL_DAG',
        requiresClarification: false,
        isAutonomousSafe: false,
      };
    }
  }

  public async validatePlan(plan: BrainPlan): Promise<ValidatedBrainPlan> {
    await Promise.resolve();
    this.logger.log(`Validating BrainPlan: ${plan.id}`);

    let hasCriticalStep = false;

    // 1. Iterate through plan.steps and validate that every capabilityRequired exists and is healthy
    const validatedSteps = plan.steps.map((step) => {
      if (step.executionType === 'capability' && step.capabilityRequired) {
        const capability = this.toolRegistry
          .getAvailableTools()
          .find((t) => t.name === step.capabilityRequired);

        if (!capability) {
          this.logger.error(
            `Validation failed: Capability ${step.capabilityRequired} not found for step ${step.id}`,
          );
          throw new BadRequestException(
            `Capability required by step ${step.id} not found in registry: ${step.capabilityRequired}`,
          );
        }

        if (capability.isHealthy && !capability.isHealthy()) {
          this.logger.error(
            `Validation failed: Capability ${step.capabilityRequired} is offline.`,
          );
          throw new BadRequestException(
            `Capability required by step ${step.id} is currently unavailable/offline: ${step.capabilityRequired}`,
          );
        }
      }

      // 2. Check risk level of individual steps
      const s = step as unknown as Record<string, unknown>;
      if (s.risk === 'CRITICAL') {
        hasCriticalStep = true;
        return {
          ...step,
          approval: {
            ...((s.approval as Record<string, unknown>) || {}),
            requiresApproval: true,
            approvalReason: 'CRITICAL risk level detected in this step.',
          },
        };
      }

      return step;
    });

    // 3. Check the total risk level of the plan
    const isPlanCritical =
      (plan as unknown as Record<string, unknown>).totalRisk === 'CRITICAL';

    // 4. Output a ValidatedBrainPlan (update the status to VALIDATED)
    const validatedPlan: ValidatedBrainPlan = {
      ...plan,
      status: 'VALIDATED',
      steps: validatedSteps,
    };

    // 5. Implement Security Auditing on Plan Level
    if (isPlanCritical || hasCriticalStep) {
      this.logger.warn(
        `CRITICAL risk detected in plan ${plan.id}. Mutating plan to require approval.`,
      );
      validatedPlan.approval = {
        requiresApproval: true,
        approvalReason:
          'CRITICAL risk level detected in the plan or one of its steps.',
      };
    }

    return validatedPlan;
  }
}
