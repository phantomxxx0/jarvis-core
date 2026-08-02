/**
 * Defines the lifecycle states of a goal, plan, or step.
 */
export enum BrainPlanStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  BLOCKED = 'BLOCKED',
}
