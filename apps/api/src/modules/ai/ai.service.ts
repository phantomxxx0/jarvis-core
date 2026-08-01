import { Injectable } from '@nestjs/common';

import { ChatMessage } from './interfaces/chat-message.interface';
import { AIRouter } from './router/ai.router';
import { QdrantProvider } from './providers/qdrant.provider';
import { PromptBuilderService } from './services/prompt-builder.service';

@Injectable()
export class AIService {
  constructor(
    private readonly aiRouter: AIRouter,
    private readonly qdrantProvider: QdrantProvider,
    private readonly promptBuilder: PromptBuilderService,
  ) {}

  async chat(
    messages: ChatMessage[],
  ): Promise<string> {
    const latestMessage = messages.at(-1);

    if (!latestMessage) {
      throw new Error('No chat messages provided.');
    }

    // Generate embedding for the latest user message
    const embedding = await this.aiRouter.embed(
      latestMessage.content,
    );

    // Retrieve relevant semantic memories
    const memories =
      await this.qdrantProvider.searchMemory(
        embedding,
        5,
      );

    // Build the memory context
    const memoryContext = memories.map((memory) => ({
      id: String(memory.id),
      score: memory.score ?? 0,
      content:
        typeof memory.payload?.content === 'string'
          ? memory.payload.content
          : '',
    }));

    // Build the final prompt
    const prompt = this.promptBuilder.build(
      messages,
      memoryContext,
    );

    // Generate the response
    return this.aiRouter.chat(prompt);
  }

  embed(text: string) {
    return this.aiRouter.embed(text);
  }

  reason(prompt: string) {
    return this.aiRouter.reason(prompt);
  }
}
