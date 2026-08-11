import { Principal } from './principal.interface';

/**
 * The one object every downstream module receives. Nobody asks
 * "who is the user" or "am I allowed" separately — it's all here,
 * or the request should already have been rejected during construction.
 */
export interface ExecutionContext {
  principal: Principal;
  requestId: string;
  traceId: string;
  createdAt: Date;
}
