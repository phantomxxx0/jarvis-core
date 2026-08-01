import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from './users';

export const memories = pgTable(
  'memories',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    type: text('type').notNull(),

    origin: text('origin').notNull(),

    content: text('content').notNull(),

    metadata: jsonb('metadata'),

    importance: integer('importance').notNull().default(50),

    status: text('status').notNull().default('ACTIVE'),

    version: integer('version').notNull().default(1),

    qdrantPointId: text('qdrant_point_id'),

    lastAccessedAt: timestamp('last_accessed_at', {
      withTimezone: true,
    }),

    expiresAt: timestamp('expires_at', {
      withTimezone: true,
    }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    userIdx: index('memories_user_idx').on(table.userId),

    typeIdx: index('memories_type_idx').on(table.type),

    statusIdx: index('memories_status_idx').on(table.status),
  }),
);
