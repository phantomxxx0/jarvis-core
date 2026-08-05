import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BrainPlan } from '../planner/contracts/brain-plan';
import { BrainPlanStep } from '../planner/contracts/brain-plan-step';
import { ToolRegistryService } from '../tools/tool-registry.service';

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

  constructor(private readonly toolRegistry: ToolRegistryService) {}

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
