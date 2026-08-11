import { BaseRule } from './base-rule';

import { KnowledgePredicate } from '../types/knowledge-predicate';
import { KnowledgeSubject } from '../types/knowledge-subject';

export class NameRule extends BaseRule {
  protected readonly patterns = [
    /^my name is (.+)$/i,
    /^i am (.+)$/i,
    /^i'm (.+)$/i,
  ];

  protected readonly subject = KnowledgeSubject.USER;

  protected readonly predicate = KnowledgePredicate.NAME;

  protected canonical(name: string): string {
    return `User's name is ${name}.`;
  }
}
