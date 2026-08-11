import { WorkerCapability } from './worker-capability';
import { WorkerKind } from '../enums/worker-kind.enum';
import { WorkerStatus } from '../enums/worker-status.enum';

/**
 * Represents the identity and configuration of an available worker.
 */
export interface Worker {
  readonly id: string;
  readonly name: string;
  readonly kind: WorkerKind;
  readonly status: WorkerStatus;
  readonly capabilities: ReadonlyArray<WorkerCapability>;
  readonly registeredAt: Date;
  readonly metadata?: Record<string, unknown>;
}
