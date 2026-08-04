import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NodeIdentity } from '../contracts/cluster/node-identity.interface';
import { ClusterManifest } from '../contracts/cluster/cluster-manifest.interface';
import {
  WorkerSession,
  NodeLease,
  TaskLease,
} from '../contracts/cluster/lifecycle.interface';
import { ClusterSnapshot } from '../contracts/cluster/cluster-snapshot.interface';
import {
  NodeRegisteredEvent,
  NodeOfflineEvent,
  LeaseExpiredEvent,
  TaskExpiredEvent,
  NodeHeartbeatEvent,
} from '../events/cluster-events';
import { randomUUID } from 'crypto';

@Injectable()
export class ClusterManagerService {
  private readonly logger = new Logger(ClusterManagerService.name);

  // In-memory state
  private readonly nodes = new Map<
    string,
    { identity: NodeIdentity; manifest: ClusterManifest }
  >();
  private readonly sessions = new Map<string, WorkerSession>();
  private readonly nodeLeases = new Map<string, NodeLease>();
  private readonly taskLeases = new Map<string, TaskLease>();

  private readonly NODE_LEASE_TTL_MS = 30000; // 30 seconds
  private readonly TASK_LEASE_TTL_MS = 60000; // 60 seconds

  constructor(private readonly eventEmitter: EventEmitter2) {}

  public registerNode(
    identity: NodeIdentity,
    manifest: ClusterManifest,
  ): WorkerSession {
    this.nodes.set(identity.nodeId, { identity, manifest });

    const session: WorkerSession = {
      sessionId: randomUUID(),
      nodeId: identity.nodeId,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      status: 'ACTIVE',
    };
    this.sessions.set(identity.nodeId, session);

    this.renewNodeLease(identity.nodeId);

    this.eventEmitter.emit(
      NodeRegisteredEvent.EVENT_NAME,
      new NodeRegisteredEvent(identity, manifest, new Date()),
    );

    this.logger.log(
      `Registered node ${identity.nodeId} in cluster ${identity.clusterId}`,
    );
    return session;
  }

  public renewNodeLease(nodeId: string): void {
    if (!this.nodes.has(nodeId)) {
      throw new Error(`Node ${nodeId} not registered`);
    }

    const session = this.sessions.get(nodeId);
    if (session) {
      session.lastHeartbeat = new Date();
    }

    const lease: NodeLease = {
      nodeId,
      leaseId: randomUUID(),
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + this.NODE_LEASE_TTL_MS),
    };
    this.nodeLeases.set(nodeId, lease);

    this.eventEmitter.emit(
      NodeHeartbeatEvent.EVENT_NAME,
      new NodeHeartbeatEvent(nodeId, new Date()),
    );
  }

  public removeNodeLease(nodeId: string): void {
    if (this.nodeLeases.has(nodeId)) {
      this.nodeLeases.delete(nodeId);
      const session = this.sessions.get(nodeId);
      if (session) {
        session.status = 'OFFLINE';
      }
    }
  }

  public registerTaskLease(taskId: string, nodeId: string): void {
    const lease: TaskLease = {
      taskId,
      nodeId,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + this.TASK_LEASE_TTL_MS),
    };
    this.taskLeases.set(taskId, lease);
  }

  public renewTaskLease(taskId: string): void {
    const lease = this.taskLeases.get(taskId);
    if (!lease) {
      throw new Error(`Task lease ${taskId} not found`);
    }
    lease.expiresAt = new Date(Date.now() + this.TASK_LEASE_TTL_MS);
  }

  public generateSnapshot(): ClusterSnapshot {
    const activeNodes = Array.from(this.sessions.values()).filter(
      (s) => s.status === 'ACTIVE',
    ).length;

    // In a full implementation, we'd aggregate CPU/RAM from ResourceProfile
    const totalCapacity = { cpu: 0, ram: 0 };

    const nodes = Array.from(this.nodes.values()).map((n) => ({
      identity: n.identity,
      session: this.sessions.get(n.identity.nodeId)!,
    }));

    return {
      timestamp: new Date(),
      activeNodes,
      totalCapacity,
      nodes,
    };
  }

  // Active Sweep Daemon
  @Cron(CronExpression.EVERY_5_SECONDS)
  handleLeaseExpirations() {
    const now = new Date();

    // Check Node Leases
    for (const [nodeId, lease] of this.nodeLeases.entries()) {
      if (now > lease.expiresAt) {
        this.logger.warn(`Node lease expired for node ${nodeId}`);

        const session = this.sessions.get(nodeId);
        if (session) {
          session.status = 'OFFLINE';
        }

        this.nodeLeases.delete(nodeId);

        this.eventEmitter.emit(
          LeaseExpiredEvent.EVENT_NAME,
          new LeaseExpiredEvent(lease.leaseId, nodeId, now),
        );
        this.eventEmitter.emit(
          NodeOfflineEvent.EVENT_NAME,
          new NodeOfflineEvent(nodeId, 'LEASE_EXPIRED', now),
        );
      }
    }

    // Check Task Leases
    for (const [taskId, lease] of this.taskLeases.entries()) {
      if (now > lease.expiresAt) {
        this.logger.warn(
          `Task lease expired for task ${taskId} on node ${lease.nodeId}`,
        );

        this.taskLeases.delete(taskId);

        this.eventEmitter.emit(
          TaskExpiredEvent.EVENT_NAME,
          new TaskExpiredEvent(taskId, lease.nodeId, now),
        );
      }
    }
  }
}
