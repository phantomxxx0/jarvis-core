import { Injectable } from '@nestjs/common';

import { db } from '@jarvis/database';

@Injectable()
export class DatabaseService {
  readonly db = db;
}
