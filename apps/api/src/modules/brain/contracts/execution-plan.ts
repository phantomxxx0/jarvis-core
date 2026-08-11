import { Task } from './task';
import { ExecutionResult } from './execution-result';

export interface ExecutionPlan {
  id: string;
  planId: string;
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  pendingTasks: Task[];
  completedTasks: ExecutionResult[];
}
