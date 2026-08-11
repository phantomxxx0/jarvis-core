import { Module, OnModuleInit } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { WorkerRegistryModule } from '../registry/worker-registry.module';
import { WorkerRegistryService } from '../registry/worker-registry.service';
import { OllamaModule } from '../shared/ollama/ollama.module';

import { ProviderRegistryService } from './registry/provider-registry.service';
import { EmbeddingService } from './services/embedding.service';
import { OllamaProvider } from './providers/ollama/ollama.provider';
import { EmbeddingWorker } from './embedding.worker';

/**
 * Module responsible for AI embedding capability generation.
 */
@Module({
  imports: [HttpModule, WorkerRegistryModule, OllamaModule],
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
