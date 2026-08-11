import { Injectable, Logger } from '@nestjs/common';
import { PlannerService } from '../planner/planner.service';
import { CapabilityRegistryService } from '../../registry/capability-registry.service';
import { TaskRouterService } from '../router/task-router.service';
import { ObservationManagerService } from '../../observation/services/observation-manager.service';
import { InferenceService } from '../../workers/inference/services/inference.service';
import { InferenceProviderType } from '../../workers/inference/enums/provider.enum';
import { AuthorizationService } from '../../governance/authorization/authorization.service';
import type { ExecutionContext } from '../../governance/interfaces/execution-context.interface';

@Injectable()
export class ExecutionRunnerService {
  private readonly logger = new Logger(ExecutionRunnerService.name);

  constructor(
    private readonly plannerService: PlannerService,
    private readonly capabilityRegistry: CapabilityRegistryService,
    private readonly taskRouter: TaskRouterService,
    private readonly observationManager: ObservationManagerService,
    private readonly inferenceService: InferenceService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  /**
   * @param task
   * @param context           Arbitrary runtime context (existing behavior,
   *                          unrelated to governance — e.g. contextText for
   *                          prompt enrichment).
   * @param executionContext  Governance ExecutionContext for the caller.
   *                          Required for any task that dispatches through
   *                          CapabilityRegistryService — internal/direct_llm
   *                          tasks bypass this entirely, matching their
   *                          existing ungated behavior for plain LLM calls.
   * @param maxRetries
   */
  async executeTask(
    task: Record<string, unknown>,
    context: unknown = {},
    executionContext?: ExecutionContext,
    maxRetries = 2,
  ): Promise<unknown> {
    let attempt = 0;
    const currentTask = { ...task };
    const startTime = Date.now();

    while (attempt < maxRetries) {
      attempt++;
      try {
        this.logger.log(
          `[ExecutionRunner] Running task "${(currentTask.id as string) || (currentTask.name as string) || (currentTask.action as string)}" (Attempt ${attempt}/${maxRetries})`,
        );

        if (currentTask.executionType === 'internal') {
          if (currentTask.action === 'direct_llm_response') {
            const args = (currentTask.inputs ||
              currentTask.params ||
              currentTask.arguments ||
              {}) as Record<string, unknown>;

            const userQuestion = String(
              args.prompt ?? args.message ?? args.question ?? args.input ?? '',
            );

            // PATCH: Inject the retrieved memory context into the prompt
            const contextText = (context as any)?.contextText || '';
            const enrichedPrompt = contextText
              ? `[System Context / Memories]\nUse the following context to accurately answer the user. Ifthe context contains the answer, prioritize it over your base knowledge.\n\n${contextText}\n\n[User Query]\n${userQuestion}`
              : userQuestion;

            this.logger.debug({ prompt: enrichedPrompt });

            const response = await this.inferenceService.infer(
              InferenceProviderType.OLLAMA,
              {
                modelId: process.env.OLLAMA_CHAT_MODEL ?? 'llama3.1:8b',
                prompt: enrichedPrompt,
              },
            );

            this.logger.debug(response);

            // Safe property extraction from Ollama
            const finalAnswer =
              response?.content ||
              (response as any)?.answer ||
              (response as any)?.message?.content ||
              JSON.stringify(response);

            return {
              answer: finalAnswer,
            };
          }
          throw new Error(
            `Unknown internal action: ${currentTask.action as string}`,
          );
        }

        const capabilityName =
          (currentTask.action as string) ||
          (currentTask.toolName as string) ||
          (currentTask.capabilityRequired as string);

        // Governance gate: if the target capability declares a
        // requiredPermission, the caller's ExecutionContext must satisfy
        // it before dispatch. Capabilities with no requiredPermission
        // (e.g. inference/embedding workers) are unaffected. This is the
        // single boundary for every capability-registry dispatch path —
        // V1's autonomous loop and any future caller both go through it,
        // rather than each reimplementing the check.
        const definition =
          this.capabilityRegistry.getCapabilityDefinition(capabilityName);

        if (definition?.requiredPermission) {
          const allowed = this.authorizationService.can(
            executionContext,
            definition.requiredPermission,
          );

          if (!allowed) {
            this.logger.warn(
              `[ExecutionRunner] DENY — principal=${executionContext?.principal?.id ?? 'unknown'} lacks ${definition.requiredPermission} for capability=${capabilityName}`,
            );
            throw new Error(
              `Permission denied: '${capabilityName}' requires ${definition.requiredPermission}.`,
            );
          }
        }

        const candidates =
          this.capabilityRegistry.getCandidates(capabilityName);
        if (!candidates || candidates.length === 0) {
          throw new Error(
            `Execution failed: No capability provider found for '${capabilityName}'`,
          );
        }

        // Basic Selection logic: Simply select the first provider (Scheduler will handle this later)
        const provider = candidates[0];

        this.logger.log(
          `[ExecutionRunner] Dispatching task '${capabilityName}' to provider '${provider.id}'`,
        );

        const output = await provider.execute(
          capabilityName,
          currentTask.inputs ||
            currentTask.params ||
            currentTask.arguments ||
            {},
        );

        await this.observationManager.ingestObservation({
          userId: 'system',
          source: 'BRAIN_EXECUTION',
          type: 'SYSTEM_EXECUTION',
          payload: {
            taskId: currentTask.id || currentTask.name,
            capability: capabilityName,
            success: true,
            output,
            durationMs: Date.now() - startTime,
          },
          confidence: 100,
          priority: 80,
        });

        return output;
      } catch (error: unknown) {
        const errRec = error as Record<string, unknown>;
        const errorMsg = (errRec.message as string) || String(error);
        this.logger.warn(
          `[ExecutionRunner] Task failed on attempt ${attempt}: ${errorMsg}`,
        );

        if (attempt >= maxRetries) {
          await this.observationManager.ingestObservation({
            userId: 'system',
            source: 'BRAIN_EXECUTION',
            type: 'SYSTEM_EXECUTION',
            payload: {
              taskId: currentTask.id || currentTask.name,
              capability: currentTask.action || currentTask.capabilityRequired,
              success: false,
              error: errorMsg,
              durationMs: Date.now() - startTime,
            },
            confidence: 100,
            priority: 100, // higher priority for errors
          });

          throw new Error(
            `Task failed after ${maxRetries} attempts. Last error: ${errorMsg}`,
          );
        }

        // Self-Correction Loop
        this.logger.log(`[ExecutionRunner] Initiating self-correction...`);
        const correctionIntent = {
          goal: `Fix and retry failed task ${(currentTask.action as string) || (currentTask.capabilityRequired as string)}`,
          failedAction: currentTask.action || currentTask.capabilityRequired,
          failedArguments: currentTask.inputs || currentTask.params || {},
          errorMessage: errorMsg,
          primaryGoal: `Correct arguments/inputs due to execution error: ${errorMsg}`,
        };

        const correctivePlan = await this.plannerService.createPlan(
          correctionIntent,
          context,
        );
        if (
          correctivePlan &&
          correctivePlan.steps &&
          correctivePlan.steps.length > 0
        ) {
          const correctiveStep = correctivePlan.steps[0];
          currentTask.inputs =
            correctiveStep.arguments ||
            (correctiveStep as unknown as Record<string, unknown>).inputs ||
            currentTask.inputs;
          this.logger.log(
            `[ExecutionRunner] Applied self-corrected arguments: ${JSON.stringify(currentTask.inputs)}`,
          );
        }
      }
    }
  }
}
