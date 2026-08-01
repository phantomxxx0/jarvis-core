import { Injectable } from '@nestjs/common';

import { KnowledgeFact } from '../interfaces/knowledge-fact.interface';
import { ComparisonResult } from './comparison-result';

@Injectable()
export class KnowledgeComparatorService {
  compare(
    incoming: KnowledgeFact,
    existing?: KnowledgeFact,
  ): ComparisonResult {
    if (!existing) {
      return ComparisonResult.NEW;
    }

    if (
      incoming.subject === existing.subject &&
      incoming.predicate === existing.predicate &&
      incoming.object === existing.object
    ) {
      return ComparisonResult.DUPLICATE;
    }

    if (
      incoming.subject === existing.subject &&
      incoming.predicate === existing.predicate
    ) {
      return ComparisonResult.UPDATE;
    }

    return ComparisonResult.CONFLICT;
  }
}
