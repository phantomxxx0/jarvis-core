/**
 * Pipeline-internal DTO produced by IntentNormalizer.
 *
 * Represents the structured output of the LLM intent classification pipeline
 * before the orchestration boundary assigns a unique id. This type is an
 * implementation detail of the intent/ subdirectory and must not be exported
 * beyond IntentService.
 */
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
