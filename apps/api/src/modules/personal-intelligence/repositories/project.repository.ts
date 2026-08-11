import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { userProjects } from '@jarvis/database';
import { DatabaseService } from '../../../database';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type ProjectInsert = InferInsertModel<typeof userProjects>;
export type ProjectSelect = InferSelectModel<typeof userProjects>;

@Injectable()
export class ProjectRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByUserId(userId: string): Promise<ProjectSelect[]> {
    return this.database.db
      .select()
      .from(userProjects)
      .where(eq(userProjects.userId, userId));
  }

  async create(data: ProjectInsert): Promise<ProjectSelect> {
    const [result] = await this.database.db
      .insert(userProjects)
      .values(data)
      .returning();
    return result;
  }
}
