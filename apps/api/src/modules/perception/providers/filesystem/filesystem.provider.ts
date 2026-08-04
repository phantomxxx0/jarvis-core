import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as chokidar from 'chokidar';
import { PerceptionProvider } from '../../contracts/perception-provider.interface';
import {
  PerceptionEvent,
  PerceptionSourceType,
} from '../../contracts/perception-event.interface';
import { PerceptionManagerService } from '../../perception-manager.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FilesystemProvider
  implements PerceptionProvider, OnModuleInit, OnModuleDestroy
{
  public readonly name = 'FilesystemProvider';
  public readonly sourceType: PerceptionSourceType = 'FILESYSTEM';
  private readonly logger = new Logger(FilesystemProvider.name);

  private watcher?: chokidar.FSWatcher;

  constructor(
    private readonly perceptionManager: PerceptionManagerService,
    private readonly configService: ConfigService,
  ) {}

  isHealthy(): boolean {
    return !!this.watcher;
  }

  onModuleInit() {
    const watchPath = this.configService.get<string>('FS_WATCH_PATH');
    if (!watchPath) {
      this.logger.log('FS_WATCH_PATH not set. Filesystem watcher disabled.');
      return;
    }

    this.logger.log(
      `Initializing chokidar filesystem watcher on: ${watchPath}`,
    );
    this.watcher = chokidar.watch(watchPath, {
      ignored: /(^|[\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher
      .on('add', (path) => {
        void this.emitEvent('file_add', { path });
      })
      .on('change', (path) => {
        void this.emitEvent('file_change', { path });
      })
      .on('unlink', (path) => {
        void this.emitEvent('file_unlink', { path });
      })
      .on('error', (error) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Watcher error: ${errorMsg}`);
      });
  }

  async onModuleDestroy() {
    if (this.watcher) {
      await this.watcher.close();
    }
  }

  private async emitEvent(action: string, data: Record<string, unknown>) {
    const event: PerceptionEvent = {
      id: randomUUID(),
      sourceType: this.sourceType,
      sourceId: `fs-watcher`,
      timestamp: new Date(),
      payload: { action, ...data },
    };

    try {
      await this.perceptionManager.ingestEvent(event);
    } catch (err) {
      this.logger.error(`Failed to ingest filesystem event: ${err}`);
    }
  }
}
