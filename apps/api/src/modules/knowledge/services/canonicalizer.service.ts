import { Injectable } from '@nestjs/common';

import { KnowledgeFact } from '../interfaces/knowledge-fact.interface';

import { NameRule } from '../rules/name.rule';

@Injectable()
export class CanonicalizerService {
  private readonly rules = [new NameRule()];

  canonicalize(text: string): KnowledgeFact[] {
    const facts: KnowledgeFact[] = [];

    for (const rule of this.rules) {
      const fact = rule.match(text);

      if (fact) {
        facts.push(fact);
      }
    }

    return facts;
  }
}
