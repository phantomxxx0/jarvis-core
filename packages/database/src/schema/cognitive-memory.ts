import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  real,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { conversations } from './conversations';
import { memories } from './memories'; // for embeddingId referencing existing memories if needed

export const episodes = pgTable('episodes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id')
    .references(() => conversations.id, { onDelete: 'set null' }),
  embeddingId: uuid('embedding_id'), // if it points to vector store memory id
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  participants: jsonb('participants'), // array of participant names/roles
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  importance: integer('importance').default(50).notNull(), // 1-100
  confidence: integer('confidence').default(100).notNull(), // 1-100
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const graphEntities = pgTable('graph_entities', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(), // PERSON, LOCATION, PROJECT, DEVICE, COMPANY, BOOK, MOVIE, SERVICE, PET, ACCOUNT, EVENT, SKILL, LANGUAGE, CUSTOM
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const graphAliases = pgTable('graph_aliases', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  entityId: uuid('entity_id')
    .notNull()
    .references(() => graphEntities.id, { onDelete: 'cascade' }),
  alias: text('alias').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const graphRelationships = pgTable('graph_relationships', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  fromEntity: uuid('from_entity')
    .notNull()
    .references(() => graphEntities.id, { onDelete: 'cascade' }),
  relation: text('relation').notNull(), // FATHER, MOTHER, BROTHER, LIKES, OWNS, WORKS_AT, etc.
  toEntity: uuid('to_entity')
    .notNull()
    .references(() => graphEntities.id, { onDelete: 'cascade' }),
  confidence: integer('confidence').default(100).notNull(), // 1-100
  sourceConversation: uuid('source_conversation_id')
    .references(() => conversations.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const procedures = pgTable('procedures', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const procedureSteps = pgTable('procedure_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  procedureId: uuid('procedure_id')
    .notNull()
    .references(() => procedures.id, { onDelete: 'cascade' }),
  stepOrder: integer('step_order').notNull(),
  instruction: text('instruction').notNull(),
  command: text('command'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const memoryMetadata = pgTable('memory_metadata', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  memoryType: text('memory_type').notNull(), // EPISODE, GRAPH_ENTITY, GRAPH_RELATIONSHIP, PROCEDURE, PROJECT, DEVICE, etc.
  memoryId: uuid('memory_id').notNull(), // Polymorphic ID
  status: text('status').default('ACTIVE').notNull(), // ACTIVE, DORMANT, ARCHIVED, FORGOTTEN
  importance: integer('importance').default(50).notNull(), // 1-100
  confidence: integer('confidence').default(100).notNull(), // 1-100
  accessCount: integer('access_count').default(1).notNull(),
  lastAccessAt: timestamp('last_access_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  customMetadata: jsonb('custom_metadata'),
});
