export interface ReasonerDecision {
  approved: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasoning?: string;
  modificationsNeeded?: string[];
}
