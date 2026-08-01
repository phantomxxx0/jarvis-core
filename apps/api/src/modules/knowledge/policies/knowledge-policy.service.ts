import { Injectable } from '@nestjs/common';

import { ComparisonResult } from '../evolution/comparison-result';

@Injectable()
export class KnowledgePolicyService {
  shouldStore(
    result: ComparisonResult,
  ): boolean {
    switch (result) {
      case ComparisonResult.NEW:
        return true;

      case ComparisonResult.UPDATE:
        return true;

      case ComparisonResult.DUPLICATE:
        return false;

      case ComparisonResult.CONFLICT:
        return true;

      default:
        return false;
    }
  }
}
