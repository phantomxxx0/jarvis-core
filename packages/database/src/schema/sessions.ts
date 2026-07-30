import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from './users';

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    refreshTokenHash: text('refresh_token_hash').notNull(),

    deviceName: text('device_name'),

    userAgent: text('user_agent'),

    ipAddress: text('ip_address'),

    isRevoked: boolean('is_revoked')
      .notNull()
      .default(false),

    expiresAt: timestamp('expires_at', {
      withTimezone: true,
    }).notNull(),

    lastUsedAt: timestamp('last_used_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

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
    userIdx: index('sessions_user_idx').on(table.userId),

    expiresIdx: index('sessions_expires_idx').on(table.expiresAt),

    revokedIdx: index('sessions_revoked_idx').on(table.isRevoked),
  }),
);
