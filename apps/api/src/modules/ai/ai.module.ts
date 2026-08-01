import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AIService } from './ai.service';
import { AIRouter } from './router/ai.router';

import { OllamaProvider } from './providers/ollama.provider';
import { QdrantProvider } from './providers/qdrant.provider';

import { LocalWorker } from './workers/local.worker';
import { FriendWorker } from './workers/friend.worker';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseURL: config.getOrThrow<string>('OLLAMA_BASE_URL'),
        timeout: config.getOrThrow<number>('OLLAMA_TIMEOUT_MS'),
      }),
    }),
  ],
  providers: [
    AIService,

    AIRouter,

    OllamaProvider,
    QdrantProvider,

    LocalWorker,
    FriendWorker,
  ],
  exports: [AIService],
})
export class AIModule {}
