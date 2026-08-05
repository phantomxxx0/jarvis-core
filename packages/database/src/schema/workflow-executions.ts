import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const workflowExecutionStatusEnum = [
  'PENDING',
  'RUNNING',
  'SUCCESS',
  'FAILED',
  'CANCELLED',
  'TIMED_OUT',
] as const;

export const workflowExecutions = pgTable('workflow_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name'),
  status: text('status', { enum: workflowExecutionStatusEnum }).notNull().default('PENDING'),
  definition: jsonb('definition').notNull(),
  state: jsonb('state').notNull().default({}),
  error: jsonb('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
});
