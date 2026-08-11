import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MemoriesService } from '../../memories/memories.service';

@Injectable()
export class CodebaseIndexerService {
  private readonly logger = new Logger(CodebaseIndexerService.name);

  constructor(private readonly memoriesService: MemoriesService) {}

  async indexRepository(
    userId: string,
    targetDir = process.cwd(),
  ): Promise<{
    indexedFilesCount: number;
    scannedFiles: number;
    sampleFiles: string[];
    lastError?: string;
  }> {
    this.logger.log(
      `[Indexer] Starting indexRepository for user ${userId}. targetDir=${targetDir}`,
    );

    let searchDir = targetDir;
    for (let i = 0; i < 4; i++) {
      try {
        await fs.access(path.join(searchDir, 'package.json'));
        break;
      } catch {
        searchDir = path.resolve(searchDir, '..');
      }
    }

    const files = await this.walkDir(searchDir, [
      'node_modules',
      'dist',
      '.git',
      '.pnpm',
      'coverage',
      '.next',
      'build',
    ]);
    this.logger.log(`[Indexer] Scanned ${files.length} files total.`);

    let indexedCount = 0;
    const sampleFiles: string[] = [];
    let lastError: string | undefined;

    for (const filePath of files) {
      try {
        const relPath = path.relative(searchDir, filePath);
        const ext = path.extname(filePath).toLowerCase();
        const basename = path.basename(filePath);

        const allowed =
          [
            '.ts',
            '.tsx',
            '.js',
            '.jsx',
            '.json',
            '.md',
            '.yml',
            '.yaml',
          ].includes(ext) || basename.includes('.env');
        if (!allowed) {
          continue;
        }

        if (sampleFiles.length < 5) {
          sampleFiles.push(relPath);
        }

        const content = await fs.readFile(filePath, 'utf-8');
        if (!content || !content.trim()) {
          continue;
        }
        if (content.length > 200000) {
          continue;
        }

        await this.memoriesService.create({
          userId,
          type: 'SEMANTIC',
          origin: 'CODEBASE_INDEX',
          content: `File Path: ${relPath}\n\n\`\`\`${ext.replace('.', '') || 'text'}\n${content}\n\`\`\``,
        });

        indexedCount++;
      } catch (err: unknown) {
        const errorRecord = err as Record<string, unknown>;
        lastError = (errorRecord.message as string) || String(err);
        if (errorRecord.detail)
          lastError += ` | Detail: ${errorRecord.detail as string}`;
        if (errorRecord.code)
          lastError += ` | Code: ${errorRecord.code as string}`;
        this.logger.error(`[Indexer] Error indexing ${filePath}: ${lastError}`);
      }
    }

    this.logger.log(
      `[Indexer] Completed. Successfully indexed ${indexedCount} out of ${files.length} files.`,
    );
    return {
      indexedFilesCount: indexedCount,
      scannedFiles: files.length,
      sampleFiles,
      lastError,
    };
  }

  private async walkDir(dir: string, ignoreDirs: string[]): Promise<string[]> {
    let results: string[] = [];
    try {
      const list = await fs.readdir(dir, { withFileTypes: true });
      for (const file of list) {
        if (ignoreDirs.includes(file.name) || file.name.startsWith('.')) {
          continue;
        }
        const res = path.resolve(dir, file.name);
        if (file.isDirectory()) {
          results = results.concat(await this.walkDir(res, ignoreDirs));
        } else if (file.isFile()) {
          results.push(res);
        }
      }
    } catch (e: unknown) {
      const err = e as Error;
      this.logger.warn(`[Indexer] Error walking ${dir}: ${err.message}`);
    }
    return results;
  }
}
