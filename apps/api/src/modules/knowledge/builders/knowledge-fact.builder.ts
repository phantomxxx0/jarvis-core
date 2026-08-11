import { randomUUID } from 'crypto';

import { KnowledgeFact } from '../interfaces/knowledge-fact.interface';
import { KnowledgePredicate } from '../types/knowledge-predicate';
import { KnowledgeSource } from '../types/knowledge-source';
import { KnowledgeStatus } from '../types/knowledge-status';
import { KnowledgeSubject } from '../types/knowledge-subject';

export class KnowledgeFactBuilder {
  static create(params: {
    subject: KnowledgeSubject;
    predicate: KnowledgePredicate;
    object: string;
    canonical: string;
    confidence?: number;
    importance?: number;
    source?: KnowledgeSource;
    metadata?: Record<string, unknown>;
  }): KnowledgeFact {
    const now = new Date();

    return {
      id: randomUUID(),

      subject: params.subject,

      predicate: params.predicate,

      object: params.object,

      canonical: params.canonical,

      confidence: params.confidence ?? 1.0,

      importance: params.importance ?? 5,

      source: params.source ?? KnowledgeSource.CONVERSATION,

      status: KnowledgeStatus.CANDIDATE,

      version: 1,

      createdAt: now,

      updatedAt: now,

      metadata: params.metadata,
    };
  }
}
