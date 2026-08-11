import { Injectable } from '@nestjs/common';
import { and, eq, or, ilike } from 'drizzle-orm';
import { worldEntities, worldRelationships } from '@jarvis/database';
import { DatabaseService } from '../../../database';

export interface CreateGraphEntityData {
  userId: string;
  name: string;
  type: string;
  description?: string;
  metadata?: unknown;
}

export interface CreateGraphRelationshipData {
  userId: string;
  fromEntity: string;
  relation: string;
  toEntity: string;
  confidence?: number;
  sourceConversation?: string;
}

@Injectable()
export class GraphRepository {
  constructor(private readonly database: DatabaseService) {}

  async createEntity(data: CreateGraphEntityData) {
    const [entity] = await this.database.db
      .insert(worldEntities)
      .values({
        ownerId: data.userId,
        name: data.name,
        type: data.type,
        description: data.description,
        scope: 'USER',
        metadata: data.metadata,
      })
      .returning();
    return entity;
  }

  async findEntityByName(userId: string, name: string) {
    const [entity] = await this.database.db
      .select()
      .from(worldEntities)
      .where(
        and(eq(worldEntities.ownerId, userId), ilike(worldEntities.name, name)),
      );
    return entity;
  }

  async findEntityById(userId: string, id: string) {
    const [entity] = await this.database.db
      .select()
      .from(worldEntities)
      .where(and(eq(worldEntities.ownerId, userId), eq(worldEntities.id, id)));
    return entity;
  }

  async createRelationship(data: CreateGraphRelationshipData) {
    const [rel] = await this.database.db
      .insert(worldRelationships)
      .values({
        userId: data.userId,
        sourceEntityId: data.fromEntity,
        targetEntityId: data.toEntity,
        relationshipType: data.relation,
        confidence: data.confidence,
        metadata: data.sourceConversation
          ? { sourceConversation: data.sourceConversation }
          : undefined,
      })
      .returning();

    // Map back to the expected output shape
    return {
      id: rel.id,
      userId: rel.userId,
      fromEntity: rel.sourceEntityId,
      toEntity: rel.targetEntityId,
      relation: rel.relationshipType,
      confidence: rel.confidence,
    };
  }

  async findRelationshipsByEntityId(userId: string, entityId: string) {
    const rels = await this.database.db
      .select()
      .from(worldRelationships)
      .where(
        and(
          eq(worldRelationships.userId, userId),
          or(
            eq(worldRelationships.sourceEntityId, entityId),
            eq(worldRelationships.targetEntityId, entityId),
          ),
        ),
      );

    return rels.map((r) => ({
      id: r.id,
      userId: r.userId,
      fromEntity: r.sourceEntityId,
      toEntity: r.targetEntityId,
      relation: r.relationshipType,
      confidence: r.confidence,
    }));
  }

  async searchEntities(userId: string, query: string, limit = 10) {
    return this.database.db
      .select()
      .from(worldEntities)
      .where(
        and(
          eq(worldEntities.ownerId, userId),
          ilike(worldEntities.name, `%${query}%`),
        ),
      )
      .limit(limit);
  }

  async searchRelationshipsByRelation(
    userId: string,
    relation: string,
    limit = 10,
  ) {
    const rels = await this.database.db
      .select()
      .from(worldRelationships)
      .where(
        and(
          eq(worldRelationships.userId, userId),
          ilike(worldRelationships.relationshipType, `%${relation}%`),
        ),
      )
      .limit(limit);

    return rels.map((r) => ({
      id: r.id,
      userId: r.userId,
      fromEntity: r.sourceEntityId,
      toEntity: r.targetEntityId,
      relation: r.relationshipType,
      confidence: r.confidence,
    }));
  }
}
