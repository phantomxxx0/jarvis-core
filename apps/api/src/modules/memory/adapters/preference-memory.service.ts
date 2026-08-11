import { Injectable, Logger } from '@nestjs/common';
import { and, eq, ilike } from 'drizzle-orm';
import { userPreferences } from '@jarvis/database';
import { DatabaseService } from '../../../database';
import {
  IMemoryService,
  MemoryContext,
  MemoryRankParams,
  MemoryRetrievalParams,
  MemoryStoreParams,
  MemoryUpdateParams,
} from '../interfaces/memory-service.interface';

export interface PreferenceMemoryData {
  id?: string;
  category: string;
  key: string;
  value: string;
  confidence?: number;
}

@Injectable()
export class PreferenceMemoryService implements IMemoryService<PreferenceMemoryData> {
  private readonly logger = new Logger(PreferenceMemoryService.name);

  constructor(private readonly database: DatabaseService) {}

  async store(
    params: MemoryStoreParams<PreferenceMemoryData>,
  ): Promise<PreferenceMemoryData> {
    await this.database.db.insert(userPreferences).values({
      userId: params.userId,
      category: params.data.category,
      key: params.data.key,
      value: params.data.value,
      confidence: params.data.confidence ?? 100,
    });
    return params.data;
  }

  async retrieve(
    params: MemoryRetrievalParams,
  ): Promise<PreferenceMemoryData[]> {
    // An empty/undefined query means "no category filter — return all
    // preferences for this user." Used by standing-preference loading,
    // which must not depend on topic-based retrieval gating.
    const hasQuery = params.query && params.query.trim().length > 0;

    const preferences = await this.database.db
      .select()
      .from(userPreferences)
      .where(
        hasQuery
          ? and(
              eq(userPreferences.userId, params.userId),
              ilike(userPreferences.category, `%${params.query}%`),
            )
          : eq(userPreferences.userId, params.userId),
      )
      .limit(params.limit ?? 10);

    return preferences.map((p) => ({
      id: p.id,
      category: p.category,
      key: p.key,
      value: p.value,
      confidence: p.confidence,
    }));
  }

  async update(
    params: MemoryUpdateParams<PreferenceMemoryData>,
  ): Promise<PreferenceMemoryData> {
    throw new Error('Method not implemented.');
  }

  async rank(params: MemoryRankParams): Promise<number> {
    return 100;
  }

  async summarize(memoryIds: string[]): Promise<string> {
    return 'Preference memory summary stub';
  }

  async composeContext(
    params: MemoryRetrievalParams,
  ): Promise<MemoryContext[]> {
    const data = await this.retrieve(params);
    return data.map((p) => ({
      content: `Preference [${p.category}]: ${p.key} = ${p.value}`,
      source: 'PreferenceMemory',
      confidence: p.confidence ?? 100,
      memoryId: p.id,
    }));
  }
}
