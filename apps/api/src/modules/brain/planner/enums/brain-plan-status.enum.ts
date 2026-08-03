/**
 * Defines the lifecycle states of a goal, plan, or step.
 */
export enum BrainPlanStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  BLOCKED = 'BLOCKED',
}
