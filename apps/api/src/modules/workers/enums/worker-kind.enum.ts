/**
 * Broad categorization of the worker's operational domain.
 */
export enum WorkerKind {
  INFERENCE = 'INFERENCE',
  EMBEDDING = 'EMBEDDING',
  SYSTEM = 'SYSTEM',
  AUTOMATION = 'AUTOMATION',
  ROBOTICS = 'ROBOTICS',
  MCP = 'MCP',
  EXTERNAL = 'EXTERNAL',
}
