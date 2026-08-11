import { KnowledgePredicate } from '../types/knowledge-predicate';
import { KnowledgeSource } from '../types/knowledge-source';
import { KnowledgeStatus } from '../types/knowledge-status';
import { KnowledgeSubject } from '../types/knowledge-subject';

export interface KnowledgeFact {
  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Entity this fact describes.
   */
  subject: KnowledgeSubject;

  /**
   * Relationship/property.
   */
  predicate: KnowledgePredicate;

  /**
   * Value of the fact.
   */
  object: string;

  /**
   * Canonical human-readable representation.
   */
  canonical: string;

  /**
   * Confidence score.
   * Range: 0.0 → 1.0
   */
  confidence: number;

  /**
   * Importance score.
   * Range: 1 → 10
   */
  importance: number;

  /**
   * Origin of this knowledge.
   */
  source: KnowledgeSource;

  /**
   * Current lifecycle state.
   */
  status: KnowledgeStatus;

  /**
   * Version number.
   */
  version: number;

  /**
   * When the fact was first learned.
   */
  createdAt: Date;

  /**
   * Last modification time.
   */
  updatedAt: Date;

  /**
   * Optional structured metadata.
   */
  metadata?: Record<string, unknown>;
}
