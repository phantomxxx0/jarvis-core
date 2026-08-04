import { NodeIdentity } from './node-identity.interface';
import { WorkerSession } from './lifecycle.interface';

export interface ClusterSnapshot {
  timestamp: Date;
  activeNodes: number;
  totalCapacity: Record<string, number>; // e.g. CPU, RAM
  nodes: {
    identity: NodeIdentity;
    session: WorkerSession;
  }[];
}
