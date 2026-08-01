import { Injectable } from '@nestjs/common';

import { AIWorker } from './ai-worker.interface';

@Injectable()
export class FriendWorker implements AIWorker {
  readonly id = 'friend';

  readonly name = 'Friend GPU';

  async health(): Promise<boolean> {
    return false;
  }

  async chat(): Promise<never> {
    throw new Error('Friend worker not configured');
  }

  async embed(): Promise<never> {
    throw new Error('Friend worker not configured');
  }

  async reason(): Promise<never> {
    throw new Error('Friend worker not configured');
  }
}
