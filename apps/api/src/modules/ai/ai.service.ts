import { Injectable } from '@nestjs/common';

import { AIRouter } from './router/ai.router';

@Injectable()
export class AIService {
  constructor(
    private readonly aiRouter: AIRouter,
  ) {}

  chat(messages: unknown[]) {
    return this.aiRouter.chat(messages);
  }

  embed(text: string) {
    return this.aiRouter.embed(text);
  }

  reason(prompt: string) {
    return this.aiRouter.reason(prompt);
  }
}
