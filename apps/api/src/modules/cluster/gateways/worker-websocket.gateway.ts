import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClusterManagerService } from '../services/cluster-manager.service';
import { WorkerTransportGateway } from '../interfaces/worker-transport-gateway.interface';
import { NodeIdentity } from '../contracts/cluster/node-identity.interface';
import { ClusterManifest } from '../contracts/cluster/cluster-manifest.interface';
import { NodeOfflineEvent } from '../events/cluster-events';
import { TaskPlannerService } from '../../runtime/services/task-planner.service';
import type {
  TaskEnvelope,
  ResultEnvelope,
  ProgressFrame,
  HeartbeatFrame,
} from '../contracts/execution/envelopes.interface';

@WebSocketGateway({
  namespace: '/cluster',
  cors: { origin: '*' },
})
export class WorkerWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect, WorkerTransportGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WorkerWebSocketGateway.name);

  // Mapping of nodeId -> Socket ID
  private readonly nodeSockets = new Map<string, string>();
  // Mapping of Socket ID -> nodeId
  private readonly socketNodes = new Map<string, string>();

  constructor(
    @Inject(forwardRef(() => ClusterManagerService))
    private readonly clusterManager: ClusterManagerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly taskPlanner: TaskPlannerService,
  ) { }

  async handleConnection(client: Socket) {
    this.logger.log(
      `Client connected: ${client.id}. Waiting for registration...`,
    );
    await Promise.resolve();
  }

  async handleDisconnect(client: Socket) {
    const nodeId = this.socketNodes.get(client.id);
    if (nodeId) {
      this.disconnect(nodeId);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
    await Promise.resolve();
  }

  @SubscribeMessage('register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { identity: NodeIdentity; manifest: ClusterManifest },
  ) {
    const { identity, manifest } = payload;

    // Call cluster manager
    const session = this.clusterManager.registerNode(identity, manifest);

    // Map socket
    this.nodeSockets.set(identity.nodeId, client.id);
    this.socketNodes.set(client.id, identity.nodeId);

    this.connect(identity.nodeId);

    // Diagnostic runtime validation dispatch
    setTimeout(() => {
      try {
        const plan = this.taskPlanner.planTask({ capabilityId: 'system.info', input: {} });
        this.logger.log(`Dispatching task system-info to ${plan.workerId}`);
        this.dispatchTask(plan.workerId, {
          taskId: 'demo-system-info',
          capabilityId: plan.capabilityId,
          payload: {},
          traceId: 'trace-1',
          correlationId: 'corr-1',
          executionId: 'exec-1'
        }).catch(err => this.logger.error(err));
      } catch (err) {
        this.logger.error(`Failed to plan diagnostic task: ${err instanceof Error ? err.message : String(err)}`);
      }
    }, 2000);

    return { status: 'REGISTERED', sessionId: session.sessionId };
  }

  connect(nodeId: string): void {
    this.logger.log(
      `Node ${nodeId} successfully registered on WebSocket Gateway`,
    );
  }

  disconnect(nodeId: string): void {
    const socketId = this.nodeSockets.get(nodeId);
    if (socketId) {
      this.socketNodes.delete(socketId);
      this.nodeSockets.delete(nodeId);
    }

    // Trigger lease cleanup
    try {
      this.clusterManager.removeNodeLease(nodeId);
    } catch {
      // In case removeNodeLease is not yet implemented or node is already removed
    }

    this.eventEmitter.emit(
      NodeOfflineEvent.EVENT_NAME,
      new NodeOfflineEvent(nodeId, 'SOCKET_DISCONNECT', new Date()),
    );
  }

  async dispatchTask(nodeId: string, task: TaskEnvelope): Promise<void> {
    const socketId = this.nodeSockets.get(nodeId);
    if (!socketId) {
      throw new Error(`Node ${nodeId} is not connected`);
    }
    this.server.to(socketId).emit('task.dispatch', task);
    await Promise.resolve();
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ) {
    const frame = payload as HeartbeatFrame;
    const nodeId = this.socketNodes.get(client.id);
    if (nodeId) {
      this.onHeartbeat(nodeId, frame);
    }
  }

  onHeartbeat(nodeId: string, frame: HeartbeatFrame): void {
    try {
      this.logger.log(
        `Heartbeat from ${nodeId} at ${String(frame.timestamp)}`,
      );
      this.clusterManager.renewNodeLease(nodeId);
    } catch {
      this.logger.warn(`Could not renew lease for ${nodeId}`);
    }
  }

  @SubscribeMessage('progress')
  handleProgressMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ) {
    const frame = payload as ProgressFrame;
    const nodeId = this.socketNodes.get(client.id);
    if (nodeId) {
      this.onProgress(nodeId, frame);
    }
  }

  onProgress(nodeId: string, frame: ProgressFrame): void {
    this.eventEmitter.emit(`task.progress.${frame.correlationId}`, frame);
  }

  @SubscribeMessage('result')
  handleResultMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ) {
    const result = payload as ResultEnvelope;
    const nodeId = this.socketNodes.get(client.id);
    if (nodeId) {
      this.onResult(nodeId, result);
    }
  }

  onResult(nodeId: string, result: ResultEnvelope): void {
    this.logger.log('Received ResultEnvelope');
    this.logger.log(`Status ${result.status}`);
    this.eventEmitter.emit(`task.result.${result.correlationId}`, result);
  }
}
