export interface Decision {
  approved: boolean;
  confidence: number;
  reasoning: string;
  risks: string[];
  missingInformation: string[];
  recommendations: string[];
}
