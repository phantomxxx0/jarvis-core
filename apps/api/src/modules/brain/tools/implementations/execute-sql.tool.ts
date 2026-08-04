import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { JarvisTool } from '../tool.interface';
import { DatabaseService } from '../../../../database/database.service';

@Injectable()
export class ExecuteSqlTool implements JarvisTool {
  public readonly name = 'execute_sql';
  public readonly description = 'Executes a raw SQL query safely.';

  private readonly logger = new Logger(ExecuteSqlTool.name);

  constructor(private readonly dbService: DatabaseService) {}

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const query = args.query as string;

    if (!query) {
      throw new Error('query argument is required for execute_sql tool.');
    }

    this.logger.warn(`[LIVE EXECUTION] Executing SQL Query: ${query}`);

    try {
      const result = await this.dbService.db.execute(sql.raw(query));
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Database execution failed: ${errorMsg}`);
      throw new Error(`Database execution failed: ${errorMsg}`);
    }
  }
}
