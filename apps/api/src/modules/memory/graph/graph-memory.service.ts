import { Injectable, Logger } from '@nestjs/common';
import {
  IMemoryService,
  MemoryContext,
  MemoryRankParams,
  MemoryRetrievalParams,
  MemoryStoreParams,
  MemoryUpdateParams,
} from '../interfaces/memory-service.interface';
import { GraphRepository } from './graph.repository';

export interface GraphMemoryData {
  entities: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  relationships: Array<{
    from: string;
    relation: string;
    to: string;
    confidence?: number;
  }>;
}

@Injectable()
export class GraphMemoryService implements IMemoryService<GraphMemoryData> {
  private readonly logger = new Logger(GraphMemoryService.name);

  constructor(private readonly graphRepo: GraphRepository) {}

  async store(
    params: MemoryStoreParams<GraphMemoryData>,
  ): Promise<GraphMemoryData> {
    const { userId, conversationId, data } = params;

    // First pass: create entities
    const entityIdMap = new Map<string, string>();
    for (const ent of data.entities) {
      let existing = await this.graphRepo.findEntityByName(userId, ent.name);
      if (!existing) {
        existing = await this.graphRepo.createEntity({
          userId,
          name: ent.name,
          type: ent.type,
          description: ent.description,
        });
      }
      entityIdMap.set(ent.name, existing.id);
    }

    // Second pass: create relationships
    for (const rel of data.relationships) {
      const fromId = entityIdMap.get(rel.from);
      const toId = entityIdMap.get(rel.to);
      if (fromId && toId) {
        await this.graphRepo.createRelationship({
          userId,
          fromEntity: fromId,
          relation: rel.relation,
          toEntity: toId,
          confidence: rel.confidence ?? 100,
          sourceConversation: conversationId,
        });
      }
    }

    return data;
  }

  async retrieve(params: MemoryRetrievalParams): Promise<GraphMemoryData[]> {
    // Basic heuristic: search entities and relations matching query terms
    const cleanQuery = params.query.replace(/[^\w\s]/g, '');
    const terms = cleanQuery.split(' ').filter((t) => t.length > 3);
    const results: GraphMemoryData[] = [];

    for (const term of terms) {
      const entities = await this.graphRepo.searchEntities(
        params.userId,
        term,
        params.limit,
      );
      const relations = await this.graphRepo.searchRelationshipsByRelation(
        params.userId,
        term,
        params.limit,
      );

      const entityIdsToFetch = new Set<string>();
      for (const e of entities) entityIdsToFetch.add(e.id);
      for (const r of relations) {
        entityIdsToFetch.add(r.fromEntity);
        entityIdsToFetch.add(r.toEntity);
      }

      if (entityIdsToFetch.size > 0) {
        // Fetch relationships for these entities
        for (const entId of entityIdsToFetch) {
          const ent = await this.graphRepo.findEntityById(params.userId, entId);
          if (!ent) continue;

          const rels = await this.graphRepo.findRelationshipsByEntityId(
            params.userId,
            entId,
          );

          const hydratedRels: Array<{
            from: string;
            relation: string;
            to: string;
            confidence: number;
          }> = [];
          for (const r of rels) {
            const fromEnt = await this.graphRepo.findEntityById(
              params.userId,
              r.fromEntity,
            );
            const toEnt = await this.graphRepo.findEntityById(
              params.userId,
              r.toEntity,
            );
            hydratedRels.push({
              from: fromEnt?.name ?? r.fromEntity,
              relation: r.relation,
              to: toEnt?.name ?? r.toEntity,
              confidence: r.confidence ?? 50,
            });
          }

          results.push({
            entities: [
              {
                name: ent.name,
                type: ent.type,
                description: ent.description ?? undefined,
              },
            ],
            relationships: hydratedRels,
          });
        }
      }
    }
    return results;
  }

  async update(
    params: MemoryUpdateParams<GraphMemoryData>,
  ): Promise<GraphMemoryData> {
    throw new Error('Method not implemented.');
  }

  async rank(params: MemoryRankParams): Promise<number> {
    return 100; // Stub ranking
  }

  async summarize(memoryIds: string[]): Promise<string> {
    return 'Graph summary stub';
  }

  async composeContext(
    params: MemoryRetrievalParams,
  ): Promise<MemoryContext[]> {
    const data = await this.retrieve(params);
    return data.map((d) => ({
      content: JSON.stringify(d),
      source: 'GraphMemory',
      confidence: 80,
    }));
  }
}
