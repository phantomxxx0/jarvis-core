import { Injectable } from '@nestjs/common';

import { AIWorker } from './ai-worker.interface';

@Injectable()
export class FriendWorker implements AIWorker {
  readonly id = 'friend';

  readonly name = 'Friend GPU';

  health(): Promise<boolean> {
    return Promise.resolve(false);
  }

  chat(): Promise<never> {
    return Promise.reject(new Error('Friend worker not configured'));
  }

  embed(): Promise<never> {
    return Promise.reject(new Error('Friend worker not configured'));
  }

  reason(): Promise<never> {
    return Promise.reject(new Error('Friend worker not configured'));
  }
}
