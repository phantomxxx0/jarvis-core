import { Injectable } from '@nestjs/common';

import { AIWorker } from './ai-worker.interface';
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

  chat(messages: unknown[]) {
    return this.ollama.chat(messages);
  }

  embed(text: string) {
    return this.ollama.embed(text);
  }

  reason(prompt: string) {
    return this.ollama.reason(prompt);
  }
}
