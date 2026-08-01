import { Injectable } from '@nestjs/common';

import { ChatMessage } from './interfaces/chat-message.interface';
import { AIRouter } from './router/ai.router';
import { QdrantProvider } from './providers/qdrant.provider';
import { PromptBuilderService } from './services/prompt-builder.service';

import { ConversationsService } from '../conversations/conversations.service';


@Injectable()
export class AIService {
  constructor(
  private readonly aiRouter: AIRouter,
  private readonly qdrantProvider: QdrantProvider,
  private readonly promptBuilder: PromptBuilderService,
  private readonly conversationsService: ConversationsService,
 
) {}

  async chat(
    userId: string,
    messages: ChatMessage[],
  ): Promise<string> {
    const latestMessage = messages.at(-1);

    if (!latestMessage) {
      throw new Error('No chat messages provided.');
    }

    // Save the user's latest message
    await this.conversationsService.saveMessage(
      userId,
      latestMessage,
    );

    // Load recent conversation history
    const history =
      await this.conversationsService.getRecentMessages(
        userId,
        10,
      );

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

    // Build semantic memory context
    const memoryContext = memories.map((memory) => ({
      id: String(memory.id),
      score: memory.score ?? 0,
      content:
        typeof memory.payload?.content === 'string'
          ? memory.payload.content
          : '',
    }));

    // Build final prompt using conversation history + semantic memories
    const prompt = this.promptBuilder.build(
      history,
      memoryContext,
    );

    // Generate assistant response
    const answer = await this.aiRouter.chat(prompt);
    // Extract durable memories from the conversation


    // Save assistant response
    await this.conversationsService.saveMessage(
      userId,
      {
        role: 'assistant',
        content: answer,
      },
    );

    return answer;
  }

  embed(text: string) {
    return this.aiRouter.embed(text);
  }

  reason(prompt: string) {
    return this.aiRouter.reason(prompt);
  }
}
