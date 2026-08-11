/**
 * Canonical intent model for Phase 3.1.
 *
 * `id`   — unique identifier assigned once at the IntentService orchestration
 *           boundary; never generated inside the stateless pipeline.
 * All other fields are normalised from the LLM classification output.
 */
export interface Intent {
  id: string;
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
