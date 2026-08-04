import { Injectable } from '@nestjs/common';
import {
  RelationshipRepository,
  RelationshipSelect,
} from '../repositories/relationship.repository';

@Injectable()
export class RelationshipService {
  constructor(private readonly repository: RelationshipRepository) {}

  async getContextForUser(userId: string): Promise<RelationshipSelect[]> {
    return this.repository.findByUserId(userId);
  }
}
