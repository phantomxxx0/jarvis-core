import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { WorkerRegistryService } from './registry/worker-registry.service';
import { OllamaClient } from './shared/ollama/ollama.client';

import { InferenceModule } from './inference/inference.module';
import { EmbeddingModule } from './embedding/embedding.module';

@Module({
  imports: [HttpModule, InferenceModule, EmbeddingModule],
  providers: [WorkerRegistryService, OllamaClient],
  exports: [WorkerRegistryService, OllamaClient],
})
export class WorkersModule {}
