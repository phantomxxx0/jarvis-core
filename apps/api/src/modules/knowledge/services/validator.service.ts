import { Injectable } from '@nestjs/common';

import { KnowledgeFact } from '../interfaces/knowledge-fact.interface';

@Injectable()
export class ValidatorService {
  validate(
    facts: KnowledgeFact[],
  ): KnowledgeFact[] {
    return facts.filter((fact) => {
      return (
        !!fact.subject &&
        !!fact.predicate &&
        !!fact.object &&
        fact.object.trim().length > 0 &&
        !!fact.canonical &&
        fact.canonical.trim().length > 0
      );
    });
  }
}
