import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { WorkerRegistryModule } from './registry/worker-registry.module';
import { OllamaModule } from './shared/ollama/ollama.module';

import { InferenceModule } from './inference/inference.module';
import { EmbeddingModule } from './embedding/embedding.module';

@Module({
  imports: [
    HttpModule,
    WorkerRegistryModule,
    OllamaModule,
    InferenceModule,
    EmbeddingModule,
  ],
  exports: [WorkerRegistryModule, OllamaModule],
})
export class WorkersModule {}
