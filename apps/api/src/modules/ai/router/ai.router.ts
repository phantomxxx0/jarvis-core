import { Injectable } from '@nestjs/common';

import { ChatMessage } from '../interfaces/chat-message.interface';

import { LocalWorker } from '../../inference/workers/local.worker';
import { FriendWorker } from '../../inference/workers/friend.worker';

@Injectable()
export class AIRouter {
  constructor(
    private readonly localWorker: LocalWorker,
    private readonly friendWorker: FriendWorker,
  ) {}

  /**
   * Current routing strategy:
   * - Always use the local worker.
   *
   * Future:
   * - Health checks
   * - Load balancing
   * - Failover
   * - Model selection
   * - Cost-aware routing
   */
  private getWorker() {
    return this.localWorker;
  }

  embed(text: string) {
    return this.getWorker().embed(text);
  }

  chat(messages: ChatMessage[]) {
    return this.getWorker().chat(messages);
  }

  reason(prompt: string) {
    return this.getWorker().reason(prompt);
  }
}
