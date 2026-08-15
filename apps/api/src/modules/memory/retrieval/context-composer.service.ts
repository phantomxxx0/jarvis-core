import { Injectable, Logger } from '@nestjs/common';
import { GraphMemoryService } from '../graph/graph-memory.service';
import { EpisodicMemoryService } from '../episodic/episodic-memory.service';
import { SemanticMemoryService } from '../semantic/semantic-memory.service';
import { ProceduralMemoryService } from '../procedural/procedural-memory.service';
import { ProjectMemoryService } from '../adapters/project-memory.service';
import { DeviceMemoryService } from '../adapters/device-memory.service';
import { PreferenceMemoryService } from '../adapters/preference-memory.service';
import { GoalMemoryService } from '../adapters/goal-memory.service';
import { MemoryRankingService } from '../ranking/memory-ranking.service';
import {
  MemoryContext,
  MemoryRetrievalParams,
} from '../interfaces/memory-service.interface';
import { ConversationsService } from '../../conversations/conversations.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ContextComposerService {
  private readonly logger = new Logger(ContextComposerService.name);

  constructor(
    private readonly graphMemory: GraphMemoryService,
    private readonly episodicMemory: EpisodicMemoryService,
    private readonly semanticMemory: SemanticMemoryService,
    private readonly proceduralMemory: ProceduralMemoryService,
    private readonly projectMemory: ProjectMemoryService,
    private readonly deviceMemory: DeviceMemoryService,
    private readonly preferenceMemory: PreferenceMemoryService,
    private readonly goalMemory: GoalMemoryService,
    private readonly memoryRanking: MemoryRankingService,
    private readonly conversationsService: ConversationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async compose(params: MemoryRetrievalParams): Promise<string> {
    const contexts: MemoryContext[] = [];

    // Parallel retrieval from all specialized memory stores
    const tasks: Promise<MemoryContext[]>[] = [];
    const p = params.policy || {
      queryGraph: true,
      querySemantic: true,
      queryEpisodic: true,
      queryPreferences: true,
    };

    if (p.queryGraph) tasks.push(this.graphMemory.composeContext(params));
    if (p.queryEpisodic) tasks.push(this.episodicMemory.composeContext(params));
    if (p.querySemantic) tasks.push(this.semanticMemory.composeContext(params));
    if (p.queryProcedural) tasks.push(this.proceduralMemory.composeContext(params));
    if (p.queryProjects) tasks.push(this.projectMemory.composeContext(params));
    if (p.queryDevices) tasks.push(this.deviceMemory.composeContext(params));
    if (p.queryPreferences) tasks.push(this.preferenceMemory.composeContext(params));
    if (p.queryGoals) tasks.push(this.goalMemory.composeContext(params));

    // Always include recent conversation context
    tasks.push(
      this.conversationsService
        .getRecentMessages(params.userId, 5)
        .then((messages) =>
          messages.map((m) => ({
            content: `${m.role}: ${m.content}`,
            source: 'ConversationHistory',
            confidence: 100,
          })),
        ),
    );

    const results = await Promise.allSettled(tasks);

    for (const res of results) {
      if (res.status === 'fulfilled') {
        contexts.push(...res.value);
      } else {
        this.logger.error(
          `Memory retrieval failed for a subsystem: ${res.reason}`,
          res.reason?.stack,
        );
        if (res.reason?.cause) {
          this.logger.error(`Caused by:`, res.reason.cause);
        }
      }
    }

    const ranked = await this.memoryRanking.rank(contexts, params.limit ?? 20);

    // Lifecycle Update
    for (const ctx of ranked) {
      if (ctx.memoryId) {
        this.eventEmitter.emit('memory.accessed', {
          userId: params.userId,
          memoryId: ctx.memoryId,
        });
      }
    }

    return ranked.map((c) => `[${c.source}] ${c.content}`).join('\n\n');
  }
}
