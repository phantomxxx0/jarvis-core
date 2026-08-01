import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { AIRouter } from './router/ai.router';

import { OllamaProvider } from './providers/ollama.provider';
import { QdrantProvider } from './providers/qdrant.provider';

import { PromptBuilderService } from './services/prompt-builder.service';

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

  controllers: [
    AIController,
  ],

  providers: [
    AIService,

    AIRouter,

    OllamaProvider,
    QdrantProvider,

    PromptBuilderService,

    LocalWorker,
    FriendWorker,
  ],

  exports: [
    AIService,
    QdrantProvider,
  ],
})
export class AIModule {}
