export interface ReflectionReport {
  goalId: string;
  planId?: string;
  success: boolean;
  expectedOutcome: string;
  actualOutcome: string;
  executionMistakes: string[];
  unnecessaryToolUsage: string[];
  missingKnowledge: string[];
  suggestedImprovements: string[];
}
