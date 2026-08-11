/**
 * Defines the lifecycle states of a goal, plan, or step.
 */
export enum BrainPlanStatus {
  PLANNED = 'PLANNED',
  OPTIMIZED = 'OPTIMIZED',
  VALIDATED = 'VALIDATED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
