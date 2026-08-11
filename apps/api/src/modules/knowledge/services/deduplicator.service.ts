import { Injectable } from '@nestjs/common';

import { KnowledgeFact } from '../interfaces/knowledge-fact.interface';

@Injectable()
export class DeduplicatorService {
  process(facts: KnowledgeFact[]): KnowledgeFact[] {
    const seen = new Set<string>();

    return facts.filter((fact) => {
      const key = [
        fact.subject,
        fact.predicate,
        fact.object.toLowerCase(),
      ].join('|');

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    });
  }
}
