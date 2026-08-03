import { Module } from '@nestjs/common';

import { WorkerRegistryService } from './worker-registry.service';

/**
 * Leaf module that owns WorkerRegistryService.
 *
 * Extracted from WorkersModule to break the circular dependency:
 *   WorkersModule → InferenceModule → WorkersModule
 *   WorkersModule → EmbeddingModule → WorkersModule
 *
 * As a leaf module it has no upstream imports, so InferenceModule and
 * EmbeddingModule can safely import it without creating a cycle.
 *
 * WorkersModule re-exports this module so all existing consumers
 * (BrainModule, AIModule, MemoriesModule) continue to receive
 * WorkerRegistryService without any changes to their wiring.
 */
@Module({
  providers: [WorkerRegistryService],
  exports: [WorkerRegistryService],
})
export class WorkerRegistryModule {}
