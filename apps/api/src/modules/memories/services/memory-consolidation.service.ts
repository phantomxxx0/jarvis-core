import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MemoriesService } from '../memories.service';
import { InferenceService } from '../../workers/inference/services/inference.service';

export interface InferenceWorkerService {
  chat?(options: {
    messages: { role: string; content: string }[];
    temperature?: number;
  }): Promise<unknown>;
  execute?(options: { prompt: string; temperature?: number }): Promise<unknown>;
}

function isInferenceWorker(
  service: unknown,
): service is InferenceWorkerService {
  return (
    service !== null &&
    typeof service === 'object' &&
    ('chat' in service || 'execute' in service)
  );
}

@Injectable()
export class MemoryConsolidationService {
  private readonly logger = new Logger(MemoryConsolidationService.name);

  constructor(
    private readonly memoriesService: MemoriesService,
    private readonly inferenceService: InferenceService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async consolidateMemories(): Promise<void> {
    this.logger.log('Starting background memory consolidation...');

    try {
      // Fetch the latest unconsolidated conversational memories
      const rawMemories = await this.memoriesService.findUnconsolidated(50);

      if (!rawMemories || rawMemories.length === 0) {
        this.logger.log(
          'No un-consolidated memory entries found. Skipping consolidation.',
        );
        return;
      }

      this.logger.log(
        `Found ${rawMemories.length} raw conversational memories. Grouping by user...`,
      );

      // Group memories by userId to consolidate contextually
      const memoriesByUser = new Map<string, typeof rawMemories>();
      for (const memory of rawMemories) {
        const uid = memory.userId;
        if (!memoriesByUser.has(uid)) {
          memoriesByUser.set(uid, []);
        }
        memoriesByUser.get(uid)!.push(memory);
      }

      for (const [userId, userMemories] of memoriesByUser.entries()) {
        const memoryTexts = userMemories
          .map((m) => `[${m.createdAt.toISOString()}] ${m.content}`)
          .join('\n');

        const systemPrompt =
          'You are an AI memory consolidator. Analyze the following conversational logs. Extract only the permanent, objective facts, technical decisions, and user preferences. Format as a concise bulleted list. Do not include conversational filler.';
        const prompt = `Consolidate the following logs:\n\n${memoryTexts}`;

        let response: unknown;

        if (isInferenceWorker(this.inferenceService)) {
          if (this.inferenceService.chat) {
            response = await this.inferenceService.chat({
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
              ],
              temperature: 0.1,
            });
          } else if (this.inferenceService.execute) {
            response = await this.inferenceService.execute({
              prompt: `${systemPrompt}\n\n${prompt}`,
              temperature: 0.1,
            });
          }
        }

        const r = response as Record<string, unknown> | undefined;
        const message = r?.message as Record<string, unknown> | undefined;
        const content =
          message?.content ||
          r?.content ||
          (typeof response === 'string'
            ? response
            : JSON.stringify(response || {}));

        const finalContent = content as string;

        if (!finalContent || finalContent === '{}') {
          this.logger.warn(
            `Failed to extract consolidated facts for user ${userId}.`,
          );
          continue;
        }

        // Save as a high-priority semantic memory
        await this.memoriesService.create({
          userId,
          type: 'SEMANTIC',
          origin: 'SYSTEM_CONSOLIDATION',
          content: finalContent,
          importance: 90,
        });

        // Archive the original raw memories
        for (const memory of userMemories) {
          await this.memoriesService.archive(userId, memory.id);
        }

        this.logger.log(
          `Consolidated and archived ${userMemories.length} memories for user ${userId}.`,
        );
      }

      this.logger.log('Background memory consolidation completed.');
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Error during background memory consolidation: ${err.message}`,
        err.stack,
      );
    }
  }
}
