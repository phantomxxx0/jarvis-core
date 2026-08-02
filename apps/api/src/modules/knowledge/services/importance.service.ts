import { Injectable } from '@nestjs/common';

import { KnowledgeFact } from '../interfaces/knowledge-fact.interface';
import { KnowledgePredicate } from '../types/knowledge-predicate';

@Injectable()
export class ImportanceService {
  rank(facts: KnowledgeFact[]): KnowledgeFact[] {
    return facts.map((fact) => ({
      ...fact,
      importance: fact.importance ?? this.defaultImportance(fact),
    }));
  }

  private defaultImportance(fact: KnowledgeFact): number {
    switch (fact.predicate) {
      case KnowledgePredicate.NAME:
        return 10;

      default:
        return 5;
    }
  }
}
