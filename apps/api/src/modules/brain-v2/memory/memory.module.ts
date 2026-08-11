import { Module } from '@nestjs/common';
import { MemoryGateway } from './memory-gateway';
import { ConsolidationQueue } from './consolidation-queue';
import { MemoryModule as V1MemoryModule } from '../../memory/memory.module';

/**
 * MemoryModule (Brain V2)
 *
 * The V2 memory access module. Wraps the existing V1 MemoryModule
 * behind a single gateway interface.
 *
 * IMPORTANT: This module imports V1's MemoryModule to gain access
 * to ContextComposerService via RetrievalModule export.
 * Brain V2 does NOT import V1 memory sub-services directly.
 *
 * Exported:
 *   - MemoryGateway: the single V2 memory access point.
 *   - ConsolidationQueue: async post-response memory write queue.
 */
@Module({
  imports: [V1MemoryModule],
  providers: [MemoryGateway, ConsolidationQueue],
  exports: [MemoryGateway, ConsolidationQueue],
})
export class MemoryGatewayModule {}
