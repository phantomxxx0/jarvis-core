import { Injectable } from '@nestjs/common';

import { ChatMessage } from '../interfaces/chat-message.interface';

export interface MemoryContext {
  id: string;
  score: number;
  content: string;
}

@Injectable()
export class PromptBuilderService {
  build(
    messages: ChatMessage[],
    memories: MemoryContext[],
  ): ChatMessage[] {
    const memorySection =
      memories.length === 0
        ? 'No relevant long-term memories found.'
        : memories
            .map(
              (memory, index) =>
                `${index + 1}. ${memory.content}`,
            )
            .join('\n');

    const systemPrompt = `
You are Jarvis, an intelligent personal AI assistant.

Use the retrieved long-term memories below when they are relevant.

Long-term memories:
${memorySection}

Rules:
- Prefer retrieved memories over assumptions.
- If the memories do not answer the question, say you don't know.
- Never invent facts about the user.
`.trim();

    return [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...messages,
    ];
  }
}
