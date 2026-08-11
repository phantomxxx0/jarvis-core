import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),

  email: text('email')
    .notNull()
    .unique(),

  name: text('name'),

  passwordHash: text('password_hash'),

  role: text('role')
    .notNull()
    .default('USER'),

  isActive: boolean('is_active')
    .notNull()
    .default(true),

  emailVerifiedAt: timestamp('email_verified_at', {
    withTimezone: true,
  }),

  lastLoginAt: timestamp('last_login_at', {
    withTimezone: true,
  }),

  failedLoginAttempts: integer('failed_login_attempts')
    .notNull()
    .default(0),

  lockoutUntil: timestamp('lockout_until', {
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
});
