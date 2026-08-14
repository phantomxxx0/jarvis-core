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
      let existing = await this.graphRepo.resolveEntity(userId, ent.name);
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
    const query = params.query;
    
    // 1. Identify Subject
    const subjectStr = this.extractSubject(query);
    console.log(`[GRAPH_DEBUG] QUERY: ${query}`);
    console.log(`[GRAPH_DEBUG] RESOLVED SUBJECT: ${subjectStr}`);
    if (!subjectStr) {
      return []; // Unresolved subject behavior: do NOT perform global retrieval.
    }

    // 2. Resolve Canonical Entity
    const canonicalEntity = await this.graphRepo.resolveEntity(params.userId, subjectStr);
    console.log(`[GRAPH_DEBUG] RESOLVED SUBJECT ID: ${canonicalEntity?.id}`);
    if (!canonicalEntity) {
      return []; // Return empty result
    }

    // 3. Extract Relationship Type
    const relationKeywords = ['father', 'mother', 'brother', 'sister', 'wife', 'husband', 'son', 'daughter', 'actor', 'favourite', 'favorite'];
    let relationFilter: string | null = null;
    for (const kw of relationKeywords) {
       if (query.toLowerCase().includes(kw)) {
          relationFilter = kw;
          break;
       }
    }
    console.log(`[GRAPH_DEBUG] RESOLVED RELATION: ${relationFilter}`);

    // 4. Entity-scoped Graph Query
    const rels = await this.graphRepo.findRelationshipsByEntityId(params.userId, canonicalEntity.id);

    const hydratedRels: Array<{
      from: string;
      relation: string;
      to: string;
      confidence: number;
    }> = [];

    for (const r of rels) {
      // 5. Only relevant relationships
      if (relationFilter && !r.relation.toLowerCase().includes(relationFilter)) {
         continue;
      }

      const fromEnt = await this.graphRepo.findEntityById(params.userId, r.fromEntity);
      const toEnt = await this.graphRepo.findEntityById(params.userId, r.toEntity);
      hydratedRels.push({
        from: fromEnt?.name ?? r.fromEntity,
        relation: r.relation,
        to: toEnt?.name ?? r.toEntity,
        confidence: r.confidence ?? 50,
      });
    }
    console.log(`[GRAPH_DEBUG] GRAPH RESULTS: ${JSON.stringify(hydratedRels)}`);

    if (hydratedRels.length === 0) {
       return [];
    }

    return [{
      entities: [{
        name: canonicalEntity.name,
        type: canonicalEntity.type,
        description: canonicalEntity.description ?? undefined,
      }],
      relationships: hydratedRels,
    }];
  }

  private extractSubject(query: string): string | null {
    const clean = query.toLowerCase();
    
    if (/\b(my|me|i|myself)\b/.test(clean)) {
      return 'USER';
    }

    const possessiveMatch = query.match(/(.+?)'s\b/i);
    if (possessiveMatch) {
      let subject = possessiveMatch[1];
      const ignoreWords = ['who', 'what', 'where', 'when', 'why', 'how', 'is', 'are', 'am', 'the', 'a', 'an', 'of', 'tell', 'me', 'about', 'can', 'you'];
      const words = subject.split(/\s+/).filter(w => w && !ignoreWords.includes(w.toLowerCase()));
      if (words.length > 0) {
        return words.join(' ');
      }
    }

    const tokens = query.replace(/[^\w\s]/g, '').split(/\s+/);
    const stopWords = ['who', 'what', 'where', 'when', 'why', 'how', 'is', 'are', 'am', 'the', 'a', 'an', 'of', 'father', 'mother', 'brother', 'sister', 'wife', 'husband', 'son', 'daughter', 'actor', 'favourite', 'favorite'];
    for (const t of tokens) {
      if (!stopWords.includes(t.toLowerCase()) && t.length > 2) {
        return t;
      }
    }

    return null;
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
