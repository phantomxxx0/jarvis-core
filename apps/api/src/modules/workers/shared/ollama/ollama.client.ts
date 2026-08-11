import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { OLLAMA_CONSTANTS } from './ollama.constants';

@Injectable()
export class OllamaClient {
  private readonly logger = new Logger(OllamaClient.name);
  readonly host: string;
  readonly timeout: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.host =
      this.configService.get<string>('OLLAMA_BASE_URL') ??
      OLLAMA_CONSTANTS.DEFAULT_HOST;

    this.timeout =
      this.configService.get<number>('OLLAMA_TIMEOUT_MS') ??
      OLLAMA_CONSTANTS.DEFAULT_TIMEOUT_MS;
  }

  async ping(): Promise<void> {
    await firstValueFrom(
      this.httpService.get(`${this.host}${OLLAMA_CONSTANTS.ENDPOINTS.TAGS}`, {
        timeout: this.timeout,
      }),
    );
  }

  get http(): HttpService {
    return this.httpService;
  }
}
