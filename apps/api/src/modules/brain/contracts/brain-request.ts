import { BrainCapability } from '../enums/brain-capability.enum';
import { BrainTask } from '../types/brain-task.type';

/**
 * The envelope passed into a BrainModule when it is asked to handle
 * a task. Distinct from BrainTask itself: BrainRequest wraps a task
 * with the invocation-level metadata a module may need (who's asking,
 * which capability was targeted, when the request was made) without
 * requiring the task shape itself to carry that information.
 */
export interface BrainRequest<TPayload = unknown> {
  /**
   * The task being requested. Payload is left generic here so that
   * concrete module implementations can narrow it via TPayload without
   * this contract needing to know about any specific task shape.
   */
  task: Omit<BrainTask, 'payload'> & { payload: TPayload };

  /**
   * The specific capability being invoked on the receiving module.
   * A module may declare multiple capabilities (see BrainModule);
   * this identifies which one applies to this particular request.
   */
  capability: BrainCapability;

  /**
   * Identifies the originating user, if any. Left as a plain string
   * (not imported from the Users/Auth modules) to keep this contract
   * free of dependencies on other domains.
   */
  requestedBy?: string;

  /**
   * When the request was created. Useful for latency tracking and
   * timeout enforcement by orchestration code outside these contracts.
   */
  requestedAt: Date;

  /**
   * Optional deadline. Advisory — enforcement is the responsibility of
   * whatever orchestrator dispatches requests to modules, not of this
   * contract or of individual module implementations.
   */
  deadline?: Date;
}
