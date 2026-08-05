import { Injectable, Logger } from '@nestjs/common';
import { ExecutionBuilderService } from './execution-builder.service';
import { ValidatedBrainPlan } from '../reasoner/reasoner.service';
import { BrainPlanStep } from '../planner/contracts/brain-plan-step';
import { ToolRegistryService } from '../tools/tool-registry.service';

@Injectable()
export class TaskEngineService {
  private readonly logger = new Logger(TaskEngineService.name);

  constructor(
    private readonly executionBuilder: ExecutionBuilderService,
    private readonly toolRegistry: ToolRegistryService,
  ) {}

  public async executePlan(plan: ValidatedBrainPlan): Promise<void> {
    this.logger.log(`Starting execution for plan: ${plan.id}`);

    const graph = this.executionBuilder.buildExecutionGraph(plan);
    this.logger.log(
      `Graph built successfully. Total stages: ${graph.stages.length}`,
    );

    plan.status = 'RUNNING';

    for (let i = 0; i < graph.stages.length; i++) {
      const stage = graph.stages[i];
      this.logger.log(`--- Starting Stage ${i + 1}/${graph.stages.length} ---`);

      try {
        await Promise.all(stage.steps.map((step) => this.executeStep(step)));
      } catch {
        this.logger.error(
          `Stage ${i + 1} failed. Halting pipeline gracefully.`,
        );
        plan.status = 'FAILED';
        return;
      }

      this.logger.log(
        `--- Completed Stage ${i + 1}/${graph.stages.length} ---`,
      );
    }

    plan.status = 'COMPLETED';
    this.logger.log(`Execution completed for plan: ${plan.id}`);
  }

  private async executeStep(step: BrainPlanStep): Promise<void> {
    this.logger.log(
      `[Executing Step] ID: ${step.id} | Type: ${step.executionType} | Capability: ${step.capabilityRequired || 'N/A'}`,
    );

    try {
      step.status = 'RUNNING';

      if (step.executionType === 'internal') {
        if (step.action === 'direct_llm_response') {
          const args = (step.arguments || {}) as Record<string, unknown>;
          step.output = { answer: args.answer || args.response || args.message || 'I have completed your request.' };
          step.status = 'COMPLETED';
        } else {
          throw new Error(`Unknown internal action: ${step.action as string}`);
        }
      } else {
        const capability = step.capabilityRequired;
        if (!capability) throw new Error('Capability required but not provided');
        
        const result = await this.toolRegistry.executeCapability(
          capability,
          step.arguments,
        );

        step.output = result;
        step.status = 'COMPLETED';
      }

      this.logger.log(`[Completed Step] ID: ${step.id}`);
    } catch (error) {
      step.status = 'FAILED';
      step.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }
}
