import { BrainTaskId } from '../types/brain-task.type';

/**
 * Discriminant for BrainResponse's outcome. Kept small and generic;
 * specific failure/success detail belongs in `data` or `error`, not
 * in new status values, so this contract doesn't need to grow every
 * time a new module introduces a new kind of failure.
 */
export type BrainResponseStatus =
  'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'DEFERRED';

/**
 * A structured error describing why a request did not fully succeed.
 * Deliberately minimal — modules should not need to import a shared
 * exception hierarchy to satisfy this contract.
 */
export interface BrainError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * The result returned by a BrainModule after handling a BrainRequest.
 */
export interface BrainResponse<TData = unknown> {
  /**
   * Correlates this response back to the originating task.
   */
  taskId: BrainTaskId;

  status: BrainResponseStatus;

  /**
   * Module-defined result payload, present when status is SUCCESS or
   * PARTIAL. Left generic for the same reason as BrainRequest's payload.
   */
  data?: TData;

  /**
   * Present when status is FAILURE, and optionally when PARTIAL.
   */
  error?: BrainError;

  /**
   * When DEFERRED, indicates the request has been accepted but not yet
   * completed (e.g. queued for async processing, awaiting a downstream
   * module). Orchestration code decides how to poll for or await the
   * eventual outcome — that mechanism is intentionally outside this
   * contract's scope.
   */
  deferredTaskId?: BrainTaskId;

  respondedAt: Date;
}
