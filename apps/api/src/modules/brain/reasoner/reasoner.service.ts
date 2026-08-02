import { Injectable } from '@nestjs/common';

import { SimplePlan } from '../planner/models/simple-plan';
import { SimpleDecision } from './models/simple-decision';

@Injectable()
export class ReasonerService {
  evaluate(_plan: SimplePlan): SimpleDecision {
    void _plan;
    return {
      approved: true,
      reason: 'Plan approved.',
    };
  }
}
