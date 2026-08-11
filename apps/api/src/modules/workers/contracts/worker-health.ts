import { WorkerStatus } from '../enums/worker-status.enum';

/**
 * Represents the health telemetry and state of a worker.
 */
export interface WorkerHealth {
  readonly workerId: string;
  readonly status: WorkerStatus;
  readonly lastPingAt: Date;
  readonly uptimeSeconds: number;
  readonly activeTasks: number;
  readonly cpuUsage?: number;
  readonly memoryUsage?: number;
  readonly metadata?: Record<string, unknown>;
}
