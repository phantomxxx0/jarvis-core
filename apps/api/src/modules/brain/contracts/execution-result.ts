export interface ExecutionResult {
  taskId: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  output: unknown;
  error?: string;
}
