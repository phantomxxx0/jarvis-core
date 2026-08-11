import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { ConversationsModule } from '../conversations/conversations.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { WorkersModule } from '../workers/workers.module';
import { BrainModule } from '../brain/brain.module'; // <-- 1. Import BrainModule
import { BrainRouterModule } from '../brain-router/brain-router.module';
import { VectorModule } from '../vector/vector.module';

import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { AIRouter } from './router/ai.router';

import { OllamaProvider } from '../inference/providers/ollama.provider';

import { PromptBuilderService } from './services/prompt-builder.service';
import { MemoryExtractorService } from './services/memory-extractor.service';

import { LocalWorker } from '../inference/workers/local.worker';
import { FriendWorker } from '../inference/workers/friend.worker';

@Module({
  imports: [
    ConfigModule,
    ConversationsModule,
    KnowledgeModule,
    WorkersModule,
    BrainModule, // <-- 2. Add BrainModule to imports so BrainService is available to AIController
    BrainRouterModule,
    VectorModule,

    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseURL: config.getOrThrow<string>('OLLAMA_BASE_URL'),
        timeout: config.getOrThrow<number>('OLLAMA_TIMEOUT_MS'),
      }),
    }),
  ],

  controllers: [AIController],

  providers: [
    AIService,

    AIRouter,
    OllamaProvider,

    PromptBuilderService,
    MemoryExtractorService,

    LocalWorker,
    FriendWorker,
  ],

  exports: [AIRouter, AIService],
})
export class AIModule {}
