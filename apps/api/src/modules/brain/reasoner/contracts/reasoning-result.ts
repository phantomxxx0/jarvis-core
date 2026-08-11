export interface ReasoningResult {
  intent: string;
  identifiedConstraints: string[];
  missingInformation: string[];
  estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  executionStrategy: 'DIRECT' | 'PIPELINE' | 'PARALLEL_DAG';
  requiresClarification: boolean;
  clarificationQuestions?: string[];
  isAutonomousSafe: boolean;
}
