export enum WorkflowExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  TIMED_OUT = 'TIMED_OUT',
}

export interface WorkflowStep {
  id: string;
  capabilityId: string;
  input: any;
  dependencies?: string[];
  condition?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface WorkflowPlanningMetadata {
  provider: string;
  model: string;
  promptVersion: string;
  repairAttempts: number;
  validationResult: 'SUCCESS' | 'FAILED' | 'REPAIRED';
  planningTimeMs: number;
}

export interface WorkflowDefinition {
  steps: WorkflowStep[];
  planningMetadata?: WorkflowPlanningMetadata;
}

export interface WorkflowExecutionDTO {
  id: string;
  userId: string;
  name?: string | null;
  status: WorkflowExecutionStatus;
  definition: WorkflowDefinition;
  state: Record<string, any>;
  error?: any;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
}
