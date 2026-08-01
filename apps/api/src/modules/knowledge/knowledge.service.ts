import { Injectable, Logger } from '@nestjs/common';

import { ChatMessage } from '../ai/interfaces/chat-message.interface';
import { MemoryExtractorService } from '../ai/services/memory-extractor.service';

import { MemoriesService } from '../memories/memories.service';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly extractor: MemoryExtractorService,
    private readonly memoriesService: MemoriesService,
  ) {}

  /**
   * Learn durable facts from a conversation.
   */
  async learn(
    userId: string,
    messages: ChatMessage[],
  ): Promise<void> {
    const extracted = await this.extractor.extract(messages);

    if (extracted.length === 0) {
      return;
    }

    this.logger.log(
      `Extracted ${extracted.length} memories.`,
    );

    for (const content of extracted) {
      try {
        await this.memoriesService.create({
          userId,
          type: 'PROFILE',
          origin: 'AI',
          content,
          importance: 8,
        });

        this.logger.log(
          `Stored memory: ${content}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to store memory: ${content}`,
          error instanceof Error
            ? error.stack
            : String(error),
        );
      }
    }
  }
}
