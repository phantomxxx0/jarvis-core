import { KnowledgeFact } from '../interfaces/knowledge-fact.interface';

export class KnowledgeMemoryMapper {
  static toMemory(userId: string, fact: KnowledgeFact) {
    return {
      userId,

      type: 'PROFILE',

      origin: 'AI',

      content: fact.canonical,

      importance: fact.importance,

      metadata: {
        subject: fact.subject,
        predicate: fact.predicate,
        object: fact.object,

        confidence: fact.confidence,

        source: fact.source,

        version: fact.version,
      },
    };
  }
}
