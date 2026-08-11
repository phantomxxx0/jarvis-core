import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database';
import { memories } from '@jarvis/database'; // PATCH: Aligned to canonical table
import { eq, and } from 'drizzle-orm';
import { OnEvent } from '@nestjs/event-emitter';
import { MemoryEvents } from '../events/memory-events.enum';

export type MemoryStatus = 'ACTIVE' | 'DORMANT' | 'ARCHIVED' | 'FORGOTTEN';

@Injectable()
export class MemoryLifecycleService {
  private readonly logger = new Logger(MemoryLifecycleService.name);

  constructor(private readonly database: DatabaseService) {}

  /**
   * Listens for retrieval events to update access stats.
   */
  @OnEvent(MemoryEvents.MEMORY_ACCESSED, { async: true })
  async handleMemoryAccessed(payload: { memoryId: string; userId: string }) {
    try {
      if (!payload.memoryId) return;
      this.logger.debug(`Updating access stats for memory ${payload.memoryId}`);

      const records = await this.database.db
        .select()
        .from(memories)
        .where(
          and(
            eq(memories.id, payload.memoryId),
            eq(memories.userId, payload.userId),
          ),
        )
        .limit(1);

      if (records.length > 0) {
        const record = records[0];
        const meta = (record.metadata as any) || {};
        const currentAccessCount = meta.accessCount || 1;

        // PATCH: Update the canonical memories table and embed access count into JSONB
        await this.database.db
          .update(memories)
          .set({
            lastAccessedAt: new Date(),
            status: 'ACTIVE', // Accessing awakes it
            metadata: { ...meta, accessCount: currentAccessCount + 1 },
          })
          .where(eq(memories.id, record.id));
      }
    } catch (error) {
      // Prevent background emitters from crashing the node process
      this.logger.error(
        `Failed to update memory lifecycle: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Initializes metadata for a newly stored memory.
   */
  async initializeMetadata(
    userId: string,
    memoryType: string,
    memoryId: string,
    importance = 50,
    confidence = 100,
  ) {
    try {
      // PATCH: Instead of inserting into a ghost table, try to update the canonical memory
      // if it exists. If it's a polymorphic ID from another table, this safely updates 0 rows.
      const meta = { accessCount: 1, confidence };
      await this.database.db
        .update(memories)
        .set({
          importance,
          status: 'ACTIVE',
          lastAccessedAt: new Date(),
          metadata: meta,
        })
        .where(and(eq(memories.id, memoryId), eq(memories.userId, userId)));
    } catch (error) {
      this.logger.warn(
        `Could not initialize metadata for ${memoryType} ${memoryId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Background sweep that determines when memories move between states based on decay.
   */
  async runLifecycleSweep() {
    this.logger.log('Running memory lifecycle sweep...');
    // Implementation of DORMANT/ARCHIVED/FORGOTTEN rules
  }
}
