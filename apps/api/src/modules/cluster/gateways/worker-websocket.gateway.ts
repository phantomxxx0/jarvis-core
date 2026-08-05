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
import { Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClusterManagerService } from '../services/cluster-manager.service';
import { WorkerTransportGateway } from '../interfaces/worker-transport-gateway.interface';
import { NodeIdentity } from '../contracts/cluster/node-identity.interface';
import { ClusterManifest } from '../contracts/cluster/cluster-manifest.interface';
import { NodeOfflineEvent } from '../events/cluster-events';
import { TaskDispatcherService } from '../../runtime/services/task-dispatcher.service';
import { ExecutionOrchestratorService } from '../../runtime/services/execution-orchestrator.service';
import { ExecutionTransport } from '../../runtime/contracts/execution-transport.interface';
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
  implements OnGatewayConnection, OnGatewayDisconnect, WorkerTransportGateway, ExecutionTransport, OnModuleInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WorkerWebSocketGateway.name);
  private readonly nodeSockets = new Map<string, string>();
  private readonly socketNodes = new Map<string, string>();

  constructor(
    @Inject(forwardRef(() => ClusterManagerService))
    private readonly clusterManager: ClusterManagerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly taskDispatcher: TaskDispatcherService,
    private readonly executionOrchestrator: ExecutionOrchestratorService,
  ) {}

  onModuleInit() {
    this.taskDispatcher.registerTransport(this);
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}. Waiting for registration...`);
  }

  async handleDisconnect(client: Socket) {
    const nodeId = this.socketNodes.get(client.id);
    if (nodeId) {
      this.disconnect(nodeId);
    }
  }

  @SubscribeMessage('register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { identity: NodeIdentity; manifest: ClusterManifest },
  ) {
    const { identity, manifest } = payload;
    const session = this.clusterManager.registerNode(identity, manifest);

    this.nodeSockets.set(identity.nodeId, client.id);
    this.socketNodes.set(client.id, identity.nodeId);
    this.connect(identity.nodeId);

    return { status: 'REGISTERED', sessionId: session.sessionId };
  }

  connect(nodeId: string): void {
    this.logger.log(`Node ${nodeId} successfully registered on WebSocket Gateway`);
  }

  disconnect(nodeId: string): void {
    const socketId = this.nodeSockets.get(nodeId);
    if (socketId) {
      this.socketNodes.delete(socketId);
      this.nodeSockets.delete(nodeId);
    }

    try {
      this.clusterManager.removeNodeLease(nodeId);
    } catch {}

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
  }

  async dispatchExecution(workerId: string, executionId: string, capabilityId: string, input: any): Promise<void> {
    const socketId = this.nodeSockets.get(workerId);
    if (!socketId) {
      throw new Error(`Node ${workerId} is not connected`);
    }
    
    const task: TaskEnvelope = {
      taskId: executionId,
      capabilityId: capabilityId,
      payload: input,
      traceId: `trace-${executionId}`,
      correlationId: executionId,
      executionId: executionId,
    };
    
    this.server.to(socketId).emit('task.dispatch', task);
  }

  async cancelTask(workerId: string, executionId: string): Promise<void> {
    const socketId = this.nodeSockets.get(workerId);
    if (socketId) {
       this.server.to(socketId).emit('task.cancel', { executionId });
    }
  }

  onHeartbeat(nodeId: string, frame: HeartbeatFrame): void {
    // Original implementation handled by handleHeartbeatMessage
  }

  onProgress(nodeId: string, frame: ProgressFrame): void {
    // Original implementation handled by handleProgressMessage
  }

  onResult(nodeId: string, result: ResultEnvelope): void {
    // Original implementation handled by handleResultMessage
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ) {
    const frame = payload as HeartbeatFrame;
    const nodeId = this.socketNodes.get(client.id);
    if (nodeId) {
      try {
        this.clusterManager.renewNodeLease(nodeId);
      } catch {
        this.logger.warn(`Could not renew lease for ${nodeId}`);
      }
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
      const execId = frame.executionId || frame.correlationId;
      if (execId) {
        this.executionOrchestrator.updateProgress(execId, frame.progress || 0).catch(err => this.logger.error(err));
      }
    }
  }

  @SubscribeMessage('result')
  handleResultMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ) {
    const result = payload as ResultEnvelope;
    const nodeId = this.socketNodes.get(client.id);
    if (nodeId) {
      const execId = result.executionId || result.correlationId;
      if (execId) {
        if (result.status === 'SUCCESS') {
          this.executionOrchestrator.completeTask(execId, (result as any).result ?? (result as any).data ?? (result as any).payload).catch(err => this.logger.error(err));
        } else {
          this.executionOrchestrator.failTask(execId, result.error).catch(err => this.logger.error(err));
        }
      }
    }
  }
}
