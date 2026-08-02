import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { ChatMessage } from '../../ai/interfaces/chat-message.interface';

type ChatResponse = {
  message: {
    content: string;
  };
};

type ReasonResponse = {
  response: string;
};

@Injectable()
export class OllamaProvider {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async chat(messages: ChatMessage[]): Promise<string> {
    const model = this.config.getOrThrow<string>('OLLAMA_CHAT_MODEL');

    const response = await firstValueFrom(
      this.http.post<ChatResponse>('/api/chat', {
        model,
        stream: false,
        messages,
      }),
    );

    return response.data.message.content;
  }

  async reason(prompt: string): Promise<string> {
    const model = this.config.getOrThrow<string>('OLLAMA_REASON_MODEL');

    const response = await firstValueFrom(
      this.http.post<ReasonResponse>('/api/generate', {
        model,
        prompt,
        stream: false,
      }),
    );

    return response.data.response;
  }
}
