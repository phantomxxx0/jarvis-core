import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BrainPlanStep } from '../planner/contracts/brain-plan-step';
import { ValidatedBrainPlan } from '../reasoner/reasoner.service';

export interface ExecutionStage {
  steps: BrainPlanStep[];
}

export interface ExecutionGraph {
  stages: ExecutionStage[];
}

@Injectable()
export class ExecutionBuilderService {
  private readonly logger = new Logger(ExecutionBuilderService.name);

  public buildExecutionGraph(plan: ValidatedBrainPlan): ExecutionGraph {
    this.logger.log(`Building ExecutionGraph for plan ${plan.id}`);

    const graph: ExecutionGraph = { stages: [] };
    const remainingSteps = new Map<string, BrainPlanStep>();
    const completedStepIds = new Set<string>();

    for (const step of plan.steps) {
      remainingSteps.set(step.id, step);
    }

    while (remainingSteps.size > 0) {
      const currentStageSteps: BrainPlanStep[] = [];

      for (const step of remainingSteps.values()) {
        const dependencies = step.dependencies || [];

        // Ensure dependencies actually exist in the plan
        for (const depId of dependencies) {
          if (!plan.steps.some((s) => s.id === depId)) {
            this.logger.error(
              `Unresolved dependency: Step ${step.id} depends on ${depId} which does not exist in the plan.`,
            );
            throw new BadRequestException(
              `Unresolved dependency: Step ${step.id} depends on ${depId} which does not exist in the plan.`,
            );
          }
        }

        // Check if all dependencies are satisfied
        const allDependenciesSatisfied = dependencies.every((depId) =>
          completedStepIds.has(depId),
        );

        if (allDependenciesSatisfied) {
          currentStageSteps.push(step);
        }
      }

      if (currentStageSteps.length === 0) {
        // If there are remaining steps but we couldn't resolve any, there's a circular dependency
        this.logger.error(
          `Circular dependency detected in plan ${plan.id}. Could not resolve execution graph.`,
        );
        throw new BadRequestException(
          `Circular dependency detected in plan ${plan.id}. Could not resolve execution graph.`,
        );
      }

      // Add resolved steps to the current stage
      graph.stages.push({ steps: currentStageSteps });

      // Remove from remaining and add to completed
      for (const step of currentStageSteps) {
        remainingSteps.delete(step.id);
        completedStepIds.add(step.id);
      }
    }

    this.logger.log(
      `Built ExecutionGraph with ${graph.stages.length} stages for plan ${plan.id}`,
    );
    return graph;
  }
}
