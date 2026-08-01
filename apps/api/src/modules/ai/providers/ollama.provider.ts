import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { ChatMessage } from '../interfaces/chat-message.interface';

@Injectable()
export class OllamaProvider {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async embed(text: string): Promise<number[]> {
    const model = this.config.getOrThrow<string>(
      'OLLAMA_EMBED_MODEL',
    );

    const response = await firstValueFrom(
      this.http.post('/api/embed', {
        model,
        input: text,
      }),
    );

    return response.data.embeddings[0];
  }

  async chat(
    messages: ChatMessage[],
  ): Promise<string> {
    const model = this.config.getOrThrow<string>(
      'OLLAMA_CHAT_MODEL',
    );

    const response = await firstValueFrom(
      this.http.post('/api/chat', {
        model,
        stream: false,
        messages,
      }),
    );

    return response.data.message.content;
  }

  async reason(
    prompt: string,
  ): Promise<string> {
    const model = this.config.getOrThrow<string>(
      'OLLAMA_REASON_MODEL',
    );

    const response = await firstValueFrom(
      this.http.post('/api/generate', {
        model,
        prompt,
        stream: false,
      }),
    );

    return response.data.response;
  }
}
