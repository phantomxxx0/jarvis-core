import { KnowledgeFactBuilder } from '../builders/knowledge-fact.builder';
import { KnowledgeFact } from '../interfaces/knowledge-fact.interface';
import { KnowledgeRule } from '../interfaces/knowledge-rule.interface';
import { KnowledgePredicate } from '../types/knowledge-predicate';
import { KnowledgeSource } from '../types/knowledge-source';
import { KnowledgeSubject } from '../types/knowledge-subject';

export abstract class BaseRule implements KnowledgeRule {
  /**
   * Patterns this rule recognizes.
   */
  protected abstract readonly patterns: RegExp[];

  /**
   * Subject of the extracted fact.
   */
  protected abstract readonly subject: KnowledgeSubject;

  /**
   * Predicate of the extracted fact.
   */
  protected abstract readonly predicate: KnowledgePredicate;

  /**
   * Generate the canonical sentence.
   */
  protected abstract canonical(object: string): string;

  /**
   * Override if needed.
   */
  protected confidence = 1.0;

  /**
   * Override if needed.
   */
  protected importance = 5;

  /**
   * Override if needed.
   */
  protected source = KnowledgeSource.CONVERSATION;

  match(text: string): KnowledgeFact | null {
    for (const pattern of this.patterns) {
      const match = text.match(pattern);

      if (!match) {
        continue;
      }

      const object = match[1].trim().replace(/[.!?,;:]+$/, '');

      if (!object) {
        continue;
      }

      return KnowledgeFactBuilder.create({
        subject: this.subject,
        predicate: this.predicate,
        object,
        canonical: this.canonical(object),
        confidence: this.confidence,
        importance: this.importance,
        source: this.source,
      });
    }

    return null;
  }
}
