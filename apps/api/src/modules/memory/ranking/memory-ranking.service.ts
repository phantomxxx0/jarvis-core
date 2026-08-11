import { Injectable, Logger } from '@nestjs/common';
import { MemoryContext } from '../interfaces/memory-service.interface';
import { DatabaseService } from '../../../database';
import { memories } from '@jarvis/database'; // PATCH: Aligned to canonical table
import { inArray } from 'drizzle-orm';

@Injectable()
export class MemoryRankingService {
  private readonly logger = new Logger(MemoryRankingService.name);

  constructor(private readonly database: DatabaseService) {}

  /**
   * Sort and prune the aggregated memory contexts dynamically based on underlying signals.
   */
  async rank(contexts: MemoryContext[], limit = 20): Promise<MemoryContext[]> {
    if (!contexts || contexts.length === 0) return [];

    try {
      const memoryIds = contexts
        .map((c) => c.memoryId)
        .filter(Boolean) as string[];

      const metadataMap = new Map<string, any>();
      if (memoryIds.length > 0) {
        // PATCH: Query canonical memories table
        const records = await this.database.db
          .select({
            id: memories.id,
            importance: memories.importance,
            lastAccessedAt: memories.lastAccessedAt,
            metadata: memories.metadata,
            status: memories.status,
          })
          .from(memories)
          .where(inArray(memories.id, memoryIds));

        for (const record of records) {
          metadataMap.set(record.id, record);
        }
      }

      const scoredContexts = contexts.map((context) => {
        const metadata = context.memoryId
          ? metadataMap.get(context.memoryId)
          : null;
        let score = context.confidence || 50; // Baseline

        // Dynamic Scoring Factors
        let importanceFactor = 0;
        let recencyFactor = 0;
        let frequencyFactor = 0;
        let relationshipStrength = 0;

        if (metadata) {
          const now = Date.now();
          const lastAccess = metadata.lastAccessedAt
            ? metadata.lastAccessedAt.getTime()
            : now;
          const recencyDays = Math.max(
            1,
            (now - lastAccess) / (1000 * 60 * 60 * 24),
          );

          recencyFactor = 10 / recencyDays; // Decay

          // Access count is now extracted safely from the JSONB column
          const accessCount = metadata.metadata?.accessCount || 1;
          frequencyFactor = Math.log10(accessCount + 1) * 10;
          importanceFactor = (metadata.importance || 50) * 0.5;

          score += importanceFactor + recencyFactor + frequencyFactor;
        }

        // Graph Relationship Strength
        if (context.source === 'GraphMemory' && context.content) {
          try {
            const parsed = JSON.parse(context.content);
            if (parsed.relationships && parsed.relationships.length > 0) {
              const sum = parsed.relationships.reduce(
                (acc: number, r: any) => acc + (r.confidence || 50),
                0,
              );
              relationshipStrength = (sum / parsed.relationships.length) * 0.5;
              score += relationshipStrength;
            }
          } catch (e) {
            // Ignore parse errors silently
          }
        }

        return { context, score };
      });

      scoredContexts.sort((a, b) => b.score - a.score);

      return scoredContexts.slice(0, limit).map((item) => item.context);
    } catch (error) {
      this.logger.error(
        `CRASH IN MemoryRankingService.rank: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // Failsafe: return unranked contexts up to limit to keep the pipeline alive
      return contexts.slice(0, limit);
    }
  }
}
