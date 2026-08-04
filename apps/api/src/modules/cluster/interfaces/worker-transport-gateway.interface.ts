import {
  TaskEnvelope,
  ResultEnvelope,
  ProgressFrame,
  HeartbeatFrame,
} from '../contracts/execution/envelopes.interface';

export interface WorkerTransportGateway {
  connect(nodeId: string): void;
  disconnect(nodeId: string): void;
  dispatchTask(nodeId: string, task: TaskEnvelope): Promise<void>;
  onHeartbeat(nodeId: string, frame: HeartbeatFrame): void;
  onProgress(nodeId: string, frame: ProgressFrame): void;
  onResult(nodeId: string, result: ResultEnvelope): void;
}
