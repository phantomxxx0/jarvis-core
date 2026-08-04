import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database';
import { observationDlq } from '@jarvis/database';

export interface CreateDlqEntryDto {
  originalObservationId: string;
  synchronizer: string;
  errorReason: string;
  retryCount: number;
}

@Injectable()
export class ObservationDlqRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(data: CreateDlqEntryDto): Promise<void> {
    await this.database.db.insert(observationDlq).values(data);
  }

  async getDlqEvents(limit = 100): Promise<any[]> {
    return this.database.db
      .select()
      .from(observationDlq)
      .limit(limit)
      .execute();
  }
}
