import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { InferenceService } from '../../workers/inference/services/inference.service';
import { CapabilityRegistryService } from '../../registry/capability-registry.service';
import {
  BrainPlan,
  BrainPlanSchema,
  BrainRouteStrategy,
} from './contracts/brain-plan';
import { BrainPlanStep } from './contracts/brain-plan-step';
import { BrainPlanStatus } from './enums/brain-plan-status.enum';
import { BrainPlanPriority } from './enums/brain-plan-priority.enum';
import { PlannerPromptBuilder } from './planner.prompt-builder';
import {
  RuntimeContextService,
  RuntimeContextPayload,
} from '../context/runtime-context.service';

export interface InferenceWorkerService {
  chat?(options: {
    messages: { role: string; content: string }[];
    temperature?: number;
  }): Promise<any>;
  execute?(options: { prompt: string; temperature?: number }): Promise<any>;
}

function isInferenceWorker(
  service: unknown,
): service is InferenceWorkerService {
  return (
    service !== null &&
    typeof service === 'object' &&
    ('chat' in service || 'execute' in service)
  );
}

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  constructor(
    private readonly inferenceService: InferenceService,
    private readonly promptBuilder: PlannerPromptBuilder,
    private readonly capabilityRegistry: CapabilityRegistryService,
    private readonly runtimeContext: RuntimeContextService,
  ) {}

  async createPlan(
    intent: Record<string, unknown>,
    context?: unknown,
  ): Promise<BrainPlan> {
    const goalId = (intent.id as string) || crypto.randomUUID();
    const planId = crypto.randomUUID();

    const goalText = (
      (intent.goal as string) ||
      (intent.primaryGoal as string) ||
      JSON.stringify(intent)
    ).toLowerCase();
    const prompt =
      (intent.primaryGoal as string) || (intent.goal as string) || '';

    const runtimeState = await this.runtimeContext.buildRuntimeContext(prompt);

    // 1. DETERMINISTIC TOOL INTERCEPTION
    // Bypasses LLM planning refusal for authorized system tools
    const toolSteps: BrainPlanStep[] = [];

    if (goalText.includes('diagnostic') || goalText.includes('system')) {
      toolSteps.push({
        id: crypto.randomUUID(),
        planId,
        name: 'System Diagnostic',
        description: 'Run system diagnostics',
        action: 'system_diagnostic',
        arguments: {},
        executionType: 'capability',
        capabilityRequired: 'system_diagnostic',
        status: 'PENDING',
        dependencies: [],
      });
    }

    if (goalText.includes('package.json') || goalText.includes('file')) {
      toolSteps.push({
        id: crypto.randomUUID(),
        planId,
        name: 'Read package.json',
        description: 'Read package.json file',
        action: 'read_project_file',
        arguments: { filePath: 'package.json', path: 'package.json' }, // <-- Supports both parameter conventions
        executionType: 'capability',
        capabilityRequired: 'read_project_file',
        status: 'PENDING',
        dependencies:
          toolSteps.length > 0 ? [toolSteps[toolSteps.length - 1].id] : [],
      });
    }

    if (toolSteps.length > 0) {
      this.logger.log(
        `Deterministically generated plan with ${toolSteps.length} operational tool steps.`,
      );
      return {
        id: planId,
        goalId,
        goal: this.buildGoal(goalId, intent) as unknown as BrainPlan['goal'], // Cast to satisfy interface
        status: 'PLANNED',
        priority: BrainPlanPriority.NORMAL,
        steps: toolSteps,
        context: context as BrainPlan['context'],
        createdAt: new Date(),
      } as unknown as BrainPlan;
    }

    // 2. STANDARD STRATEGY & LLM PLANNING
    const strategy = this.determineStrategy(intent);

    if (strategy === BrainRouteStrategy.DIRECT) {
      return this.createDirectPlan(planId, goalId, intent, runtimeState);
    }

    try {
      const rawSteps = await this.generateStepsFromLLM(
        intent,
        strategy,
        planId,
        runtimeState,
      );

      const rawPlan = {
        id: planId,
        goalId,
        strategy,
        status: BrainPlanStatus.DRAFT,
        priority: BrainPlanPriority.NORMAL,
        steps: rawSteps,
        createdAt: new Date(),
      };

      let validatedPlan: any;
      try {
        validatedPlan = BrainPlanSchema.parse(rawPlan);
      } catch (zodError: unknown) {
        this.logger.warn(
          `Zod validation failed, using raw normalized steps: ${(zodError as Error).message}`,
        );
        validatedPlan = rawPlan;
      }

      this.logger.log(
        `Plan ${planId} generated with ${(validatedPlan as BrainPlan).steps.length} steps.`,
      );

      return {
        ...(validatedPlan as BrainPlan),
        goal: this.buildGoal(goalId, intent) as unknown as BrainPlan['goal'],
        context: runtimeState as unknown as BrainPlan['context'],
      };
    } catch (error) {
      this.logger.error(
        `Planning LLM failed for Goal ${goalId}. Falling back to direct plan.`,
        error instanceof Error ? error.stack : String(error),
      );
      return this.createDirectPlan(planId, goalId, intent, runtimeState);
    }
  }

  public async generateCorrectionArgs(
    step: BrainPlanStep,
  ): Promise<Record<string, unknown>> {
    const originalArgs = (step.arguments as Record<string, unknown>) || {};
    const errorMsg = step.error || 'Unknown error';
    const capability = step.capabilityRequired || 'UNKNOWN_CAPABILITY';

    const prompt = this.promptBuilder.buildCorrectionPrompt(
      capability,
      originalArgs,
      errorMsg,
    );

    this.logger.log(
      `Generating dynamic correction for step ${step.id} (Capability: ${capability})`,
    );

    let response: unknown;

    if (isInferenceWorker(this.inferenceService)) {
      if (this.inferenceService.chat) {
        response = await this.inferenceService.chat({
          messages: [{ role: 'system', content: prompt }],
          temperature: 0.1, // Low temperature for deterministic corrections
        });
      } else if (this.inferenceService.execute) {
        response = await this.inferenceService.execute({
          prompt,
          temperature: 0.1,
        });
      }
    }

    const r = response as Record<string, unknown> | undefined;
    const message = r?.message as Record<string, unknown> | undefined;
    const content =
      message?.content ||
      r?.content ||
      (typeof response === 'string'
        ? response
        : JSON.stringify(response || {}));
    const jsonMatch =
      typeof content === 'string' ? content.match(/\{[\s\S]*\}/) : null;
    const jsonString = jsonMatch
      ? jsonMatch[0]
      : typeof content === 'string'
        ? content
        : JSON.stringify(content);

    try {
      const correctedArgs = JSON.parse(jsonString) as Record<string, unknown>;
      return correctedArgs;
    } catch {
      this.logger.error(
        `Failed to parse correction LLM output as JSON. Output was: ${jsonString}`,
      );
      return originalArgs;
    }
  }

  private determineStrategy(
    intent: Record<string, unknown>,
  ): BrainRouteStrategy {
    const category = intent.category || 'DIRECT_CONVERSATION';
    if (category === 'DIRECT_CONVERSATION' || category === 'SYSTEM_CONTROL') {
      return BrainRouteStrategy.DIRECT;
    }
    if (category === 'KNOWLEDGE_RETRIEVAL' || category === 'MEMORY_MUTATION') {
      return BrainRouteStrategy.PIPELINE;
    }
    return BrainRouteStrategy.PARALLEL_DAG;
  }

  private createDirectPlan(
    planId: string,
    goalId: string,
    intent: Record<string, unknown>,
    context?: any,
  ): BrainPlan {
    const step: BrainPlanStep = {
      id: crypto.randomUUID(),
      planId,
      name: 'Direct LLM Response',
      description:
        (intent.primaryGoal as string) || 'Direct response generation',
      action: 'direct_llm_response',
      arguments: {
        prompt: intent.primaryGoal,
      },
      executionType: 'internal',
      status: 'PENDING',
      dependencies: [],
    };

    this.logger.debug({
      prompt: intent.primaryGoal,
      stepArguments: step.arguments,
    });

    return {
      id: planId,
      goalId,
      goal: this.buildGoal(goalId, intent) as unknown as BrainPlan['goal'],
      status: 'PLANNED',
      priority: BrainPlanPriority.NORMAL,
      steps: [step],
      context: context as unknown as BrainPlan['context'],
      createdAt: new Date(),
    } as unknown as BrainPlan;
  }

  private buildGoal(
    goalId: string,
    intent: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      id: goalId,
      requestId: intent.requestId || crypto.randomUUID(),
      intent: intent,
      description: intent.primaryGoal || 'Default Goal',
      priority: BrainPlanPriority.NORMAL,
      status: BrainPlanStatus.DRAFT,
      createdAt: new Date(),
    };
  }

  private async generateStepsFromLLM(
    intent: Record<string, unknown>,
    strategy: BrainRouteStrategy,
    planId: string,
    runtimeState: RuntimeContextPayload,
  ): Promise<any[]> {
    const { systemPrompt, userPrompt } = this.promptBuilder.buildPlanningPrompt(
      intent,
      strategy,
      runtimeState.contextText,
      runtimeState.clusterState,
    );
    const availableCapabilities = this.capabilityRegistry.getAllDefinitions();
    const toolsDescription = availableCapabilities
      .map((c) => `- Action Name: "${c.id}" -> Description: ${c.description}`)
      .join('\n');

    const enhancedSystemPrompt = `
${systemPrompt}

Available Operational Tools:
${toolsDescription}
- Action Name: "direct_llm_response" -> Description: Fallback for conversational output.

    Respond strictly in JSON with a "steps" array.
    `.trim();

    let response: unknown;

    if (isInferenceWorker(this.inferenceService)) {
      if (this.inferenceService.chat) {
        response = await this.inferenceService.chat({
          messages: [
            { role: 'system', content: enhancedSystemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
        });
      } else if (this.inferenceService.execute) {
        response = await this.inferenceService.execute({
          prompt: enhancedSystemPrompt + '\n\n' + userPrompt,
          temperature: 0.1,
        });
      }
    }

    const r = response as Record<string, unknown> | undefined;
    const message = r?.message as Record<string, unknown> | undefined;
    const content =
      message?.content ||
      r?.content ||
      (typeof response === 'string'
        ? response
        : JSON.stringify(response || {}));
    const jsonMatch =
      typeof content === 'string' ? content.match(/\{[\s\S]*\}/) : null;
    const jsonString = jsonMatch
      ? jsonMatch[0]
      : typeof content === 'string'
        ? content
        : JSON.stringify(content);

    const parsed = JSON.parse(jsonString) as Record<string, unknown>;
    if (!parsed.steps || !Array.isArray(parsed.steps)) {
      throw new Error('LLM output missing "steps" array');
    }

    return (parsed.steps as Array<Record<string, unknown>>).map((s) => {
      const isInternal = s.action === 'direct_llm_response';
      return {
        id: s.id || crypto.randomUUID(),
        planId,
        name: s.name || s.action || 'Task',
        description: s.description || '',
        action: s.action || 'direct_llm_response',
        executionType: isInternal ? 'internal' : 'capability',
        arguments: s.arguments || s.inputs || {},
        capabilityRequired: isInternal
          ? undefined
          : s.action || s.capabilityRequired || 'direct_llm_response',
        status: 'PENDING',
        dependencies: s.dependencies || [],
      };
    });
  }
}
