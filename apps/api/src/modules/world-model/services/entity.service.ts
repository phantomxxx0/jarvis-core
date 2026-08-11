import { Injectable } from '@nestjs/common';
import {
  EntityRepository,
  EntitySelect,
} from '../repositories/entity.repository';

@Injectable()
export class EntityService {
  constructor(private readonly repository: EntityRepository) {}

  async getContextForUser(userId: string): Promise<EntitySelect[]> {
    // Note: Entities are global or scoped, but we fetch all for now or mock it.
    // For now we'll assume it returns an empty array to satisfy typing without breaking since worldEntities doesn't have userId.
    void userId;
    return Promise.resolve([]);
  }
}
