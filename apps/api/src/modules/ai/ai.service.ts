import { Injectable } from '@nestjs/common';

import { ChatMessage } from './interfaces/chat-message.interface';
import { AIRouter } from './router/ai.router';
import { QdrantProvider } from './providers/qdrant.provider';
import { PromptBuilderService } from './services/prompt-builder.service';

import { ConversationsService } from '../conversations/conversations.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { WorkerRegistryService } from '../workers/registry/worker-registry.service';

@Injectable()
export class AIService {
  constructor(
    private readonly aiRouter: AIRouter,
    private readonly qdrantProvider: QdrantProvider,
    private readonly promptBuilder: PromptBuilderService,
    private readonly conversationsService: ConversationsService,
    private readonly knowledgeService: KnowledgeService,
    private readonly workerRegistry: WorkerRegistryService,
  ) {}

  async chat(userId: string, messages: ChatMessage[]): Promise<string> {
    const latestMessage = messages.at(-1);

    if (!latestMessage) {
      throw new Error('No chat messages provided.');
    }

    await this.conversationsService.saveMessage(userId, latestMessage);

    const history = await this.conversationsService.getRecentMessages(
      userId,
      10,
    );

    const worker = await this.workerRegistry.getById('embedding-worker');
    if (!worker) {
      throw new Error('Embedding worker not found in registry');
    }

    const result = await worker.execute({ input: latestMessage.content });
    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Embedding generation failed');
    }

    const embedding = result.data as number[];

    const memories = await this.qdrantProvider.searchMemory(embedding, 5);

    const memoryContext = memories.map((memory) => ({
      id: String(memory.id),
      score: memory.score ?? 0,
      content:
        typeof memory.payload?.content === 'string'
          ? memory.payload.content
          : '',
    }));

    const prompt = this.promptBuilder.build(history, memoryContext);

    const answer = await this.aiRouter.chat(prompt);

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: answer,
    };

    await this.conversationsService.saveMessage(userId, assistantMessage);

    await this.knowledgeService.learnFromConversation(userId, [
      ...history,
      assistantMessage,
    ]);

    return answer;
  }

  async embed(text: string) {
    const worker = await this.workerRegistry.getById('embedding-worker');
    if (!worker) {
      throw new Error('Embedding worker not found in registry');
    }

    const result = await worker.execute({ input: text });
    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Embedding generation failed');
    }

    return result.data as number[];
  }

  reason(prompt: string) {
    return this.aiRouter.reason(prompt);
  }
}
