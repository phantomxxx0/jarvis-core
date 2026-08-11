import { Injectable, Logger } from '@nestjs/common';
import {
  ContextProvider,
  ContextSection,
} from '../../brain/context/contracts/context-provider.interface';
import { MemoriesService } from '../memories.service';

@Injectable()
export class MemoryContextProvider implements ContextProvider {
  public readonly name = 'MemoryContextProvider';
  public readonly defaultTimeoutMs = 500;
  private readonly logger = new Logger(MemoryContextProvider.name);

  constructor(private readonly memoriesService: MemoriesService) {}

  public isHealthy(): boolean {
    return true; // Expandable later for Qdrant ping checks
  }

  public async buildContext(query: string): Promise<ContextSection> {
    const emptySection: ContextSection = {
      source: 'MEMORY',
      title: 'Relevant Historical Context',
      content: '',
      hasData: false,
      priority: 90,
    };

    try {
      const memories = await this.memoriesService.searchSimilar(
        'system',
        query,
        5,
      );

      if (!memories || memories.length === 0) return emptySection;

      const formattedList = memories
        .map((m: unknown) => {
          const memoryRecord = m as Record<string, unknown>;
          const payload = memoryRecord.payload as
            Record<string, unknown> | undefined;
          const content =
            typeof payload?.content === 'string'
              ? payload.content
              : (memoryRecord.content as string) ||
                (memoryRecord.text as string) ||
                String(m);
          return `• ${content}`;
        })
        .filter((line: string) => line.trim().length > 2)
        .join('\n');

      if (!formattedList) return emptySection;

      return {
        source: 'MEMORY',
        title: 'Relevant Historical Context',
        content: `### Relevant Historical Context\n${formattedList}`,
        hasData: true,
        priority: 90,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to retrieve memory context (non-blocking): ${errorMsg}`,
      );
      return emptySection;
    }
  }
}
