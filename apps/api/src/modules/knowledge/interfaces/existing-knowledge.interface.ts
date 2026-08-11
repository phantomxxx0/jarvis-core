import { KnowledgeFact } from './knowledge-fact.interface';

export interface ExistingKnowledge {
  memory: {
    id: string;
    version: number;
    status: string;
  };

  fact: KnowledgeFact;
}
