import { Injectable } from '@nestjs/common';

import { KnowledgeRule } from '../interfaces/knowledge-rule.interface';

import { NameRule } from './name.rule';

@Injectable()
export class RuleRegistry {
  private readonly rules: KnowledgeRule[] = [new NameRule()];

  getRules(): KnowledgeRule[] {
    return this.rules;
  }

  register(rule: KnowledgeRule): void {
    this.rules.push(rule);
  }
}
