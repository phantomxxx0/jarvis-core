import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const userObservations = pgTable('user_observations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  source: text('source').notNull(),
  type: text('type').notNull(),
  confidence: integer('confidence').default(50).notNull(),
  priority: integer('priority').default(0).notNull(),
  payload: jsonb('payload').notNull(),
  metadata: jsonb('metadata'),
  correlationId: uuid('correlation_id'),
  causationId: uuid('causation_id'),
  status: text('status').default('PENDING').notNull(), // PENDING, PROCESSED, DROPPED
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const observationDlq = pgTable('observation_dlq', {
  id: uuid('id').defaultRandom().primaryKey(),
  originalObservationId: uuid('original_observation_id')
    .notNull()
    .references(() => userObservations.id, { onDelete: 'cascade' }),
  synchronizer: text('synchronizer').notNull(),
  errorReason: text('error_reason').notNull(),
  retryCount: integer('retry_count').default(0).notNull(),
  failedAt: timestamp('failed_at', { withTimezone: true }).defaultNow().notNull(),
});
