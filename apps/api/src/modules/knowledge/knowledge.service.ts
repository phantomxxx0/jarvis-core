import { Injectable, Logger } from '@nestjs/common';

import { ChatMessage } from '../ai/interfaces/chat-message.interface';

import { MemoriesService } from '../memories/memories.service';
import { MemoryIndexService } from '../memories/services/memory-index.service';

import { KnowledgeExtractorService } from './services/knowledge-extractor.service';
import { KnowledgeLookupService } from './services/knowledge-lookup.service';

import { KnowledgeComparatorService } from './evolution/knowledge-comparator.service';
import { KnowledgePolicyService } from './policies/knowledge-policy.service';

import { ComparisonResult } from './evolution/comparison-result';

import { KnowledgeMemoryMapper } from './mappers/knowledge-memory.mapper';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly extractor: KnowledgeExtractorService,
    private readonly lookup: KnowledgeLookupService,
    private readonly comparator: KnowledgeComparatorService,
    private readonly policy: KnowledgePolicyService,
    private readonly memoriesService: MemoriesService,
    private readonly memoryIndexService: MemoryIndexService,
  ) {}

  async learnFromConversation(
    userId: string,
    messages: ChatMessage[],
  ): Promise<void> {
    this.logger.log('===== KNOWLEDGE PIPELINE START =====');

    const latestUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'user');

    if (!latestUserMessage) {
      this.logger.log('No latest user message found.');
      return;
    }

    this.logger.log(`Latest message: ${latestUserMessage.content}`);

    const facts = this.extractor.extract(latestUserMessage.content);

    this.logger.log(`Facts extracted: ${facts.length}`);

    console.dir(facts, { depth: null });

    if (facts.length === 0) {
      this.logger.debug('No durable knowledge extracted.');
      return;
    }

    this.logger.log(`Extracted ${facts.length} knowledge facts.`);

    for (const fact of facts) {
      try {
        this.logger.log(`Processing fact: ${fact.canonical}`);

        const existing = await this.lookup.findExisting(userId, fact);

        this.logger.log(`Lookup result: ${existing ? 'FOUND' : 'NOT FOUND'}`);

        const comparison = this.comparator.compare(fact, existing?.fact);

        this.logger.log(`Comparison: ${comparison}`);

        if (!this.policy.shouldStore(comparison)) {
          this.logger.log(`Skipping ${comparison}: ${fact.canonical}`);

          continue;
        }

        switch (comparison) {
          case ComparisonResult.NEW:
            this.logger.log(`New knowledge: ${fact.canonical}`);
            break;

          case ComparisonResult.DUPLICATE:
            this.logger.log(`Duplicate ignored: ${fact.canonical}`);
            continue;

          case ComparisonResult.UPDATE:
            this.logger.log(`Updating knowledge: ${fact.canonical}`);

            if (existing) {
              await this.memoriesService.archive(userId, existing.memory.id);
            }

            break;

          case ComparisonResult.CONFLICT:
            this.logger.warn(`Conflict detected: ${fact.canonical}`);

            if (existing) {
              await this.memoriesService.archive(userId, existing.memory.id);
            }

            break;
        }

        const memory = KnowledgeMemoryMapper.toMemory(userId, fact);

        const storedMemory = await this.memoriesService.create(memory);

        await this.memoryIndexService.index(storedMemory);

        this.logger.log(`Stored and indexed: ${fact.canonical}`);
      } catch (error) {
        this.logger.warn(
          `Failed to process: ${fact.canonical}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    this.logger.log('===== KNOWLEDGE PIPELINE END =====');
  }
}
