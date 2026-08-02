import { Module, OnModuleInit } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { WorkersModule } from '../workers.module';
import { WorkerRegistryService } from '../registry/worker-registry.service';

import { ProviderRegistryService } from './registry/provider-registry.service';
import { EmbeddingService } from './services/embedding.service';
import { EmbeddingWorker } from './embedding.worker';
import { OllamaProvider } from './providers/ollama/ollama.provider';

@Module({
  imports: [HttpModule, WorkersModule],
  providers: [
    ProviderRegistryService,
    OllamaProvider,
    EmbeddingService,
    EmbeddingWorker,
  ],
  exports: [EmbeddingService],
})
export class EmbeddingModule implements OnModuleInit {
  constructor(
    private readonly providerRegistry: ProviderRegistryService,
    private readonly ollamaProvider: OllamaProvider,
    private readonly embeddingService: EmbeddingService,
    private readonly workerRegistry: WorkerRegistryService,
    private readonly embeddingWorker: EmbeddingWorker,
  ) {}

  async onModuleInit(): Promise<void> {
    this.providerRegistry.registerProvider(this.ollamaProvider);
    await this.embeddingService.initializeProviders();
    await this.workerRegistry.register(this.embeddingWorker);
  }
}
