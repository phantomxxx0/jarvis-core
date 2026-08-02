import { Module, OnModuleInit } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { WorkersModule } from '../workers.module';
import { WorkerRegistryService } from '../registry/worker-registry.service';

import { ProviderRegistryService } from './registry/provider-registry.service';
import { InferenceService } from './services/inference.service';
import { OllamaProvider } from './providers/ollama/ollama.provider';
import { InferenceWorker } from './inference.worker';

/**
 * Module responsible for AI inference capabilities and provider integrations.
 */
@Module({
  imports: [HttpModule, WorkersModule],
  providers: [
    ProviderRegistryService,
    OllamaProvider,
    InferenceService,
    InferenceWorker,
  ],
  exports: [InferenceService],
})
export class InferenceModule implements OnModuleInit {
  constructor(
    private readonly providerRegistry: ProviderRegistryService,
    private readonly ollamaProvider: OllamaProvider,
    private readonly inferenceService: InferenceService,
    private readonly workerRegistry: WorkerRegistryService,
    private readonly inferenceWorker: InferenceWorker,
  ) {}

  async onModuleInit(): Promise<void> {
    this.providerRegistry.registerProvider(this.ollamaProvider);

    await this.inferenceService.initializeProviders();

    await this.workerRegistry.register(this.inferenceWorker);
  }
}
