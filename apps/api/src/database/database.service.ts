import { Injectable, OnModuleDestroy } from '@nestjs/common';

import { db, client } from '@jarvis/database';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db = db;

  async onModuleDestroy(): Promise<void> {
    // Close the postgres.js connection pool so it does not keep the process alive
    await client.end();
  }
}
