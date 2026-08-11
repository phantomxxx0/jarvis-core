import { Injectable } from '@nestjs/common';

import { MemoriesService } from '../../memories/memories.service';

import { ExistingKnowledge } from '../interfaces/existing-knowledge.interface';
import { KnowledgeFact } from '../interfaces/knowledge-fact.interface';
import { MemoryKnowledgeMapper } from '../mappers/memory-knowledge.mapper';

@Injectable()
export class KnowledgeLookupService {
  constructor(private readonly memories: MemoriesService) {}

  async findExisting(
    userId: string,
    fact: KnowledgeFact,
  ): Promise<ExistingKnowledge | undefined> {
    const memories = await this.memories.findByUserId(userId);

    console.log('\n========== LOOKUP ==========');
    console.log('Incoming fact:');
    console.dir(fact, { depth: null });

    for (const memory of memories) {
      const metadata = (memory.metadata ?? {}) as Record<string, unknown>;

      console.log('\nMemory:', memory.id);
      console.dir(metadata, { depth: null });

      console.log({
        status: memory.status,
        subjectMatch: metadata.subject === fact.subject,
        predicateMatch: metadata.predicate === fact.predicate,
        objectMatch: metadata.object === fact.object,
      });

      if (
        memory.status === 'ACTIVE' &&
        metadata.subject === fact.subject &&
        metadata.predicate === fact.predicate
      ) {
        console.log('>>> MATCH FOUND');

        return {
          memory: {
            id: memory.id,
            version: memory.version,
            status: memory.status,
          },
          fact: MemoryKnowledgeMapper.toKnowledgeFact(memory),
        };
      }
    }

    console.log('>>> NO MATCH');
    return undefined;
  }
}
