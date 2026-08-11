import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { JarvisTool } from '../tool.interface';
import { DatabaseService } from '../../../database/database.service';
import { Permission } from '../../governance/enums/permission.enum';

const WRITE_KEYWORDS =
  /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|replace)\b/i;

@Injectable()
export class ExecuteSqlTool implements JarvisTool {
  public readonly name = 'execute_sql';
  public readonly description =
    'Executes a read-only SQL query (SELECT only). Write operations are blocked.';
  public readonly requiredPermission = Permission.EXECUTE_SQL;

  private readonly logger = new Logger(ExecuteSqlTool.name);

  constructor(private readonly dbService: DatabaseService) {}

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const query = args.query as string;

    if (!query) {
      throw new Error('query argument is required for execute_sql tool.');
    }

    const trimmed = query.trim();

    if (!/^select\b/i.test(trimmed)) {
      this.logger.warn(
        `[BLOCKED] Rejected non-SELECT query: ${trimmed.slice(0, 100)}`,
      );
      throw new Error(
        'execute_sql only permits read-only SELECT queries. Write operations are not allowed through this tool.',
      );
    }

    if (WRITE_KEYWORDS.test(trimmed)) {
      this.logger.warn(
        `[BLOCKED] Rejected query containing write keyword: ${trimmed.slice(0, 100)}`,
      );
      throw new Error(
        'execute_sql detected a write-related keyword in the query and blocked it.',
      );
    }

    this.logger.warn(`[LIVE EXECUTION] Executing read-only SQL: ${trimmed}`);

    try {
      const result = await this.dbService.db.execute(sql.raw(trimmed));
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Database execution failed: ${errorMsg}`);
      throw new Error(`Database execution failed: ${errorMsg}`);
    }
  }
}
