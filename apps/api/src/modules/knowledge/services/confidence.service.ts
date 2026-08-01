import { Injectable } from '@nestjs/common';

import { KnowledgeFact } from '../interfaces/knowledge-fact.interface';
import { KnowledgeSource } from '../types/knowledge-source';

@Injectable()
export class ConfidenceService {
  score(
    facts: KnowledgeFact[],
  ): KnowledgeFact[] {
    return facts.map((fact) => ({
      ...fact,
      confidence:
        fact.confidence ?? this.defaultConfidence(fact),
    }));
  }

  private defaultConfidence(
    fact: KnowledgeFact,
  ): number {
    switch (fact.source) {
      case KnowledgeSource.MANUAL:
        return 1.0;

      case KnowledgeSource.CONVERSATION:
        return 0.95;

      case KnowledgeSource.VOICE:
        return 0.90;

      case KnowledgeSource.VISION:
        return 0.90;

      case KnowledgeSource.DOCUMENT:
        return 0.85;

      case KnowledgeSource.SYSTEM:
        return 0.99;

      default:
        return 0.80;
    }
  }
}
