import { KnowledgeFact } from './knowledge-fact.interface';

export interface KnowledgeRule {
  match(text: string): KnowledgeFact | null;
}
