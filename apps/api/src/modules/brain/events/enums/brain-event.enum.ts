export enum BrainEvent {
  CONTEXT_BUILT = 'brain.context.built',
  INTENT_DETECTED = 'brain.intent.detected',
  PLAN_CREATED = 'brain.plan.created',
  PLAN_APPROVED = 'brain.plan.approved',
  PLAN_REJECTED = 'brain.plan.rejected',
  EXECUTION_PLAN_BUILT = 'brain.execution_plan.built',
  EXECUTION_STARTED = 'brain.execution.started',
  EXECUTION_FINISHED = 'brain.execution.finished',
  MEMORY_STORED = 'brain.memory.stored',
  KNOWLEDGE_UPDATED = 'brain.knowledge.updated',
}
