import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import { JarvisTool } from '../tool.interface';

@Injectable()
export class ReadFileTool implements JarvisTool {
  public readonly name = 'read_project_file';
  public readonly description = 'Reads a file from the project directory';

  private readonly logger = new Logger(ReadFileTool.name);

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const filePath = (args.filePath as string) || (args.path as string);

    if (!filePath) {
      throw new Error(
        'filePath or path argument is required for read_project_file tool.',
      );
    }

    this.logger.log(`Executing read_project_file for path: ${filePath}`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to read file ${filePath}: ${errorMsg}`);
      throw new Error(`Failed to read file: ${errorMsg}`);
    }
  }
}
