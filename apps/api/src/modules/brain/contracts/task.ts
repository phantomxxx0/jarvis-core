export interface Task {
  id: string;
  name: string;
  description: string;
  capabilityRequired: string;
  dependencies: string[];
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
}
