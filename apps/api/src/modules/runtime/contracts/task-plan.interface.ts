export interface TaskRequest {
  capabilityId: string;
  input: unknown;
}

export interface TaskPlan {
  workerId: string;
  capabilityId: string;
  reason: string;
}
