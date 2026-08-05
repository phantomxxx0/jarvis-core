export interface ExecutionTransport {
  dispatchExecution(workerId: string, executionId: string, capabilityId: string, input: any): Promise<void>;
  cancelTask(workerId: string, executionId: string): Promise<void>;
}
