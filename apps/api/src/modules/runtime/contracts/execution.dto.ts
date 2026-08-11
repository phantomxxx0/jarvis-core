export enum TaskExecutionStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  PLANNED = 'PLANNED',
  DISPATCHED = 'DISPATCHED',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  CANCELLED = 'CANCELLED',
  TIMED_OUT = 'TIMED_OUT',
  ABORTED = 'ABORTED',
}

export interface TaskExecution {
  id: string;
  userId: string;
  capabilityId: string;
  status: TaskExecutionStatus;
  input: any;
  output?: any;
  error?: any;
  workerId?: string;
  progress: number;
  attempts: number;
  maxRetries: number;
  timeoutMs?: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
