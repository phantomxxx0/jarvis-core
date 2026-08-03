import { z } from 'zod';
import { BrainGoal } from './brain-goal';
import { BrainPlanStep, BrainPlanStepSchema } from './brain-plan-step';
import { BrainPlanStatus } from '../enums/brain-plan-status.enum';
import { BrainPlanPriority } from '../enums/brain-plan-priority.enum';
import { BrainPlanContext } from '../types/brain-plan-context.type';

/**
 * Strategy chosen by the Planner for routing and execution.
 */
export enum BrainRouteStrategy {
  DIRECT = 'DIRECT',               // Single-step direct response or simple Q&A
  PIPELINE = 'PIPELINE',           // Linear sequential steps
  PARALLEL_DAG = 'PARALLEL_DAG',   // Multi-branch concurrent steps
}

/**
 * Zod schema for runtime validation of the generated plan graph.
 */
export const BrainPlanSchema = z.object({
  id: z.string().uuid(),
  goalId: z.string(),
  strategy: z.nativeEnum(BrainRouteStrategy).default(BrainRouteStrategy.PARALLEL_DAG),
  status: z.nativeEnum(BrainPlanStatus).default(BrainPlanStatus.DRAFT),
  priority: z.nativeEnum(BrainPlanPriority).default(BrainPlanPriority.NORMAL),
  steps: z.array(BrainPlanStepSchema).min(1, 'Plan must contain at least one step'),
  createdAt: z.date().default(() => new Date()),
});

/**
 * Represents a structured sequence of steps required to satisfy a goal.
 */
export interface BrainPlan {
  readonly id: string;
  readonly goalId: string;
  readonly goal: BrainGoal;
  readonly status: BrainPlanStatus;
  readonly priority: BrainPlanPriority;
  readonly steps: ReadonlyArray<BrainPlanStep>;
  readonly context?: BrainPlanContext;
  readonly createdAt: Date;
}