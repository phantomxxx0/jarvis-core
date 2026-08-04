import { NodeIdentity } from '../contracts/cluster/node-identity.interface';

export class NodeRegisteredEvent {
  static readonly EVENT_NAME = 'cluster.node.registered';
  constructor(
    public readonly identity: NodeIdentity,
    public readonly timestamp: Date,
  ) {}
}

export class NodeAuthenticatedEvent {
  static readonly EVENT_NAME = 'cluster.node.authenticated';
  constructor(
    public readonly nodeId: string,
    public readonly timestamp: Date,
  ) {}
}

export class NodeHealthyEvent {
  static readonly EVENT_NAME = 'cluster.node.healthy';
  constructor(
    public readonly nodeId: string,
    public readonly timestamp: Date,
  ) {}
}

export class NodeDrainingEvent {
  static readonly EVENT_NAME = 'cluster.node.draining';
  constructor(
    public readonly nodeId: string,
    public readonly timestamp: Date,
  ) {}
}

export class NodeOfflineEvent {
  static readonly EVENT_NAME = 'cluster.node.offline';
  constructor(
    public readonly nodeId: string,
    public readonly reason: string,
    public readonly timestamp: Date,
  ) {}
}

export class LeaseExpiredEvent {
  static readonly EVENT_NAME = 'cluster.lease.expired';
  constructor(
    public readonly leaseId: string,
    public readonly nodeId: string,
    public readonly timestamp: Date,
  ) {}
}

export class TaskExpiredEvent {
  static readonly EVENT_NAME = 'cluster.task.expired';
  constructor(
    public readonly taskId: string,
    public readonly nodeId: string,
    public readonly timestamp: Date,
  ) {}
}

export class CapabilityChangedEvent {
  static readonly EVENT_NAME = 'cluster.capability.changed';
  constructor(
    public readonly nodeId: string,
    public readonly timestamp: Date,
  ) {}
}
