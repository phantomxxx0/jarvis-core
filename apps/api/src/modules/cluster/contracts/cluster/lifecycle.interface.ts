export interface WorkerSession {
  sessionId: string;
  nodeId: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  status: 'ACTIVE' | 'DRAINING' | 'OFFLINE';
}

export interface NodeLease {
  nodeId: string;
  leaseId: string;
  issuedAt: Date;
  expiresAt: Date;
}

export interface TaskLease {
  taskId: string;
  nodeId: string;
  issuedAt: Date;
  expiresAt: Date;
}
