import { KnowledgeFact } from '../interfaces/knowledge-fact.interface';

import { KnowledgePredicate } from '../types/knowledge-predicate';
import { KnowledgeSource } from '../types/knowledge-source';
import { KnowledgeStatus } from '../types/knowledge-status';
import { KnowledgeSubject } from '../types/knowledge-subject';

interface KnowledgeMetadata {
  subject?: KnowledgeSubject;

  predicate?: KnowledgePredicate;

  object?: string;

  confidence?: number;

  source?: KnowledgeSource;

  version?: number;
}

export class MemoryKnowledgeMapper {
  static toKnowledgeFact(
    memory: {
      id: string;

      content: string;

      importance: number;

      status: string;

      metadata: unknown;

      createdAt: Date;

      updatedAt: Date;
    },
  ): KnowledgeFact {
    const metadata =
      (memory.metadata ?? {}) as KnowledgeMetadata;

    return {
      id: memory.id,

      subject:
        metadata.subject ??
        KnowledgeSubject.USER,

      predicate:
        metadata.predicate ??
        KnowledgePredicate.NAME,

      object:
        metadata.object ?? '',

      canonical:
        memory.content,

      confidence:
        metadata.confidence ?? 0.8,

      importance:
        memory.importance,

      source:
        metadata.source ??
        KnowledgeSource.CONVERSATION,

      status:
        this.mapStatus(memory.status),

      version:
        metadata.version ?? 1,

      createdAt:
        memory.createdAt,

      updatedAt:
        memory.updatedAt,

      metadata:
        memory.metadata as Record<
          string,
          unknown
        >,
    };
  }

  private static mapStatus(
    status: string,
  ): KnowledgeStatus {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return KnowledgeStatus.ACTIVE;

      case 'ARCHIVED':
        return KnowledgeStatus.ARCHIVED;

      case 'VERIFIED':
        return KnowledgeStatus.VERIFIED;

      case 'CANDIDATE':
        return KnowledgeStatus.CANDIDATE;

      default:
        return KnowledgeStatus.CANDIDATE;
    }
  }
}
