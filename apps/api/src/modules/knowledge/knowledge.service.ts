import { Injectable, Logger } from '@nestjs/common';

import { ChatMessage } from '../ai/interfaces/chat-message.interface';
import { MemoriesService } from '../memories/memories.service';

import { KnowledgeExtractorService } from './services/knowledge-extractor.service';
import { KnowledgeMemoryMapper } from './mappers/knowledge-memory.mapper';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly extractor: KnowledgeExtractorService,
    private readonly memoriesService: MemoriesService,
  ) {}

  async learnFromConversation(
    userId: string,
    messages: ChatMessage[],
  ): Promise<void> {
    const latestUserMessage =
      [...messages]
        .reverse()
        .find((m) => m.role === 'user');

    if (!latestUserMessage) {
      return;
    }

    const facts =
      this.extractor.extract(
        latestUserMessage.content,
      );

    if (facts.length === 0) {
      this.logger.debug(
        'No durable knowledge extracted.',
      );
      return;
    }

    this.logger.log(
      `Extracted ${facts.length} knowledge facts.`,
    );

    for (const fact of facts) {
      try {
        const memory =
          KnowledgeMemoryMapper.toMemory(
            userId,
            fact,
          );

        await this.memoriesService.create(memory);

        this.logger.log(
          `Stored: ${fact.canonical}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to store: ${fact.canonical}`,
          error instanceof Error
            ? error.stack
            : String(error),
        );
      }
    }
  }
}
