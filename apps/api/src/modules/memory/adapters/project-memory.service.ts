import { Injectable, Logger } from '@nestjs/common';
import { and, eq, ilike } from 'drizzle-orm';
import { userProjects } from '@jarvis/database';
import { DatabaseService } from '../../../database';
import {
  IMemoryService,
  MemoryContext,
  MemoryRankParams,
  MemoryRetrievalParams,
  MemoryStoreParams,
  MemoryUpdateParams,
} from '../interfaces/memory-service.interface';

export interface ProjectMemoryData {
  id?: string;
  name: string;
  description?: string;
  repositoryUrl?: string;
  status?: string;
}

@Injectable()
export class ProjectMemoryService implements IMemoryService<ProjectMemoryData> {
  private readonly logger = new Logger(ProjectMemoryService.name);

  constructor(private readonly database: DatabaseService) {}

  async store(
    params: MemoryStoreParams<ProjectMemoryData>,
  ): Promise<ProjectMemoryData> {
    await this.database.db.insert(userProjects).values({
      userId: params.userId,
      name: params.data.name,
      description: params.data.description,
      repositoryUrl: params.data.repositoryUrl,
      status: params.data.status ?? 'ACTIVE',
    });
    return params.data;
  }

  async retrieve(params: MemoryRetrievalParams): Promise<ProjectMemoryData[]> {
    const projects = await this.database.db
      .select()
      .from(userProjects)
      .where(
        and(
          eq(userProjects.userId, params.userId),
          ilike(userProjects.name, `%${params.query}%`),
        ),
      )
      .limit(params.limit ?? 5);

    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? undefined,
      repositoryUrl: p.repositoryUrl ?? undefined,
      status: p.status,
    }));
  }

  async update(
    params: MemoryUpdateParams<ProjectMemoryData>,
  ): Promise<ProjectMemoryData> {
    throw new Error('Method not implemented.');
  }

  async rank(params: MemoryRankParams): Promise<number> {
    return 100;
  }

  async summarize(memoryIds: string[]): Promise<string> {
    return 'Project memory summary stub';
  }

  async composeContext(
    params: MemoryRetrievalParams,
  ): Promise<MemoryContext[]> {
    const data = await this.retrieve(params);
    return data.map((p) => ({
      content: `Project: ${p.name} - ${p.description} (URL: ${p.repositoryUrl}, Status: ${p.status})`,
      source: 'ProjectMemory',
      confidence: 100, // canonical source
      memoryId: p.id,
    }));
  }
}
