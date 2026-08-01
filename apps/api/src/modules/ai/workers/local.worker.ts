import { Injectable } from '@nestjs/common';

import { AIWorker } from './ai-worker.interface';
import { ChatMessage } from '../interfaces/chat-message.interface';
import { OllamaProvider } from '../providers/ollama.provider';

@Injectable()
export class LocalWorker implements AIWorker {
  readonly id = 'local';

  readonly name = 'Local RTX';

  constructor(
    private readonly ollama: OllamaProvider,
  ) {}

  async health(): Promise<boolean> {
    return true;
  }

  chat(messages: ChatMessage[]) {
    return this.ollama.chat(messages);
  }

  embed(text: string) {
    return this.ollama.embed(text);
  }

  reason(prompt: string) {
    return this.ollama.reason(prompt);
  }
}
