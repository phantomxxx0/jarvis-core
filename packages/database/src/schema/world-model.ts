import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const worldLocations = pgTable('world_locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  parentLocationId: uuid('parent_location_id'),
  coordinate: jsonb('coordinate'), // e.g., { room, zone, lat, lng, altitude, accuracy }
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const worldEntities = pgTable('world_entities', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type').notNull(), // PERSON, DEVICE, CAMERA, SERVICE, REPO, ROOM, etc.
  scope: text('scope').notNull(), // SYSTEM, GLOBAL, ORGANIZATION, HOUSEHOLD, USER
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').default('ACTIVE').notNull(),
  metadata: jsonb('metadata'),
  locationId: uuid('location_id').references(() => worldLocations.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const worldRelationships = pgTable('world_relationships', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  sourceEntityId: uuid('source_entity_id')
    .notNull()
    .references(() => worldEntities.id, { onDelete: 'cascade' }),
  targetEntityId: uuid('target_entity_id')
    .notNull()
    .references(() => worldEntities.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type').notNull(), // OWNS, RUNS, USES, HOSTED_ON, LOCATED_IN
  confidence: integer('confidence').default(50).notNull(), // 1-100
  validFrom: timestamp('valid_from', { withTimezone: true }),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const worldEnvironmentStates = pgTable('world_environment_states', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  scope: text('scope').notNull(),
  stateKey: text('state_key').notNull(),
  stateValue: jsonb('state_value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
