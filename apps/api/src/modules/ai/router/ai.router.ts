import { Injectable } from '@nestjs/common';

import { LocalWorker } from '../workers/local.worker';
import { FriendWorker } from '../workers/friend.worker';

@Injectable()
export class AIRouter {
  constructor(
    private readonly localWorker: LocalWorker,
    private readonly friendWorker: FriendWorker,
  ) {}

  /**
   * Phase 11B:
   * Always use the local worker.
   *
   * Future:
   * - health checks
   * - load balancing
   * - failover
   * - model routing
   */
  private getWorker() {
    return this.localWorker;
  }

  embed(text: string) {
    return this.getWorker().embed(text);
  }

  chat(messages: unknown[]) {
    return this.getWorker().chat(messages);
  }

  reason(prompt: string) {
    return this.getWorker().reason(prompt);
  }
}
