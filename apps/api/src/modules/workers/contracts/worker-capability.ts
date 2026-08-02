import { WorkerKind } from '../enums/worker-kind.enum';

/**
 * Defines a specific capability supported by a worker.
 */
export interface WorkerCapability {
  readonly id: string;
  readonly name: string;
  readonly kind: WorkerKind;
  readonly version: string;
  readonly description?: string;

  /** JSON Schema representing the input payload this capability accepts. */
  readonly inputSchema?: Record<string, unknown>;

  /** JSON Schema representing the output payload this capability produces. */
  readonly outputSchema?: Record<string, unknown>;
}
