export interface CapabilityDefinition {
  id: string;
  version: string;
  description: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeout: number; // in milliseconds
  estimatedCost: number; // e.g. token cost or compute credits
  concurrencyLimit: number;
  requiresApproval: boolean;
  supportsStreaming: boolean;
  supportsCancellation: boolean;
}
