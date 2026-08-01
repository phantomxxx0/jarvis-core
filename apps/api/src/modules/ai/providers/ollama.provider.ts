import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OllamaProvider {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async embed(text: string): Promise<number[]> {
    const model = this.config.getOrThrow<string>('OLLAMA_EMBED_MODEL');

    const response = await firstValueFrom(
      this.http.post('/api/embed', {
        model,
        input: text,
      }),
    );

    return response.data.embeddings[0];
  }

  async chat(_messages: unknown): Promise<never> {
    throw new Error('chat() not implemented yet');
  }

  async reason(_prompt: string): Promise<never> {
    throw new Error('reason() not implemented yet');
  }
}
