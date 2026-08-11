import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { workflowExecutions } from './workflow-executions';

export const taskExecutionStatusEnum = [
  'PENDING',
  'QUEUED',
  'PLANNED',
  'DISPATCHED',
  'RUNNING',
  'SUCCESS',
  'FAILED',
  'RETRYING',
  'CANCELLED',
  'TIMED_OUT',
  'ABORTED',
] as const;

export const taskExecutions = pgTable('task_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  capabilityId: text('capability_id').notNull(),
  status: text('status', { enum: taskExecutionStatusEnum }).notNull().default('PENDING'),
  input: jsonb('input').notNull(),
  output: jsonb('output'),
  error: jsonb('error'),
  workerId: text('worker_id'),
  workflowExecutionId: uuid('workflow_execution_id').references(() => workflowExecutions.id, { onDelete: 'cascade' }),
  workflowStepId: text('workflow_step_id'),
  progress: integer('progress').default(0),
  attempts: integer('attempts').default(0).notNull(),
  maxRetries: integer('max_retries').default(0).notNull(),
  timeoutMs: integer('timeout_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
});
