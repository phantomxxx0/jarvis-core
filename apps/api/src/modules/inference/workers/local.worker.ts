import { Injectable } from '@nestjs/common';

import { ChatMessage } from '../../ai/interfaces/chat-message.interface';
import { OllamaProvider } from '../providers/ollama.provider';

import { AIWorker } from './ai-worker.interface';

@Injectable()
export class LocalWorker implements AIWorker {
  readonly id = 'local';

  readonly name = 'Local Worker';

  constructor(
    private readonly ollamaProvider: OllamaProvider,
  ) {}

  health(): Promise<boolean> {
    return Promise.resolve(true);
  }

  chat(messages: ChatMessage[]): Promise<string> {
    return this.ollamaProvider.chat(messages);
  }

  embed(text: string): Promise<number[]> {
    return this.ollamaProvider.embed(text);
  }

  reason(prompt: string): Promise<string> {
    return this.ollamaProvider.reason(prompt);
  }
}
