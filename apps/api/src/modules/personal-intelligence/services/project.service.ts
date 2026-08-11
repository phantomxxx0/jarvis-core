import { Injectable } from '@nestjs/common';
import {
  ProjectRepository,
  ProjectSelect,
} from '../repositories/project.repository';

@Injectable()
export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  async getContextForUser(userId: string): Promise<ProjectSelect[]> {
    return this.repository.findByUserId(userId);
  }
}
