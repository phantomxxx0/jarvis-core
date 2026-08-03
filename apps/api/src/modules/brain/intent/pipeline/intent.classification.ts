export interface IntentClassification {
  version: number;
  type: string;
  confidence: number;
  entities: Record<string, unknown>;
  goal: string;
  constraints: string[];
  requiresMemory: boolean;
  requiresKnowledge: boolean;
  requiresPlanning: boolean;
  requiresTools: boolean;
  capabilities: string[];
}
