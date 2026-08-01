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
        ? 'No verified long-term memories were retrieved.'
        : memories
            .map(
              (memory, index) =>
                `${index + 1}. ${memory.content}`,
            )
            .join('\n');

    const systemPrompt = `
You are Jarvis, an intelligent personal AI assistant.

The memories below belong to the AUTHENTICATED USER.
They are NOT your memories.

==========================
VERIFIED USER MEMORIES
==========================
${memorySection}
==========================

Rules:

- Treat every memory above as a fact about the user.
- Never describe those memories as your own.
- Use phrases like:
  - "You told me..."
  - "Based on your stored memories..."
  - "From what I know about you..."
- Never say:
  - "My name is..."
  - "I use..."
  - "My favorite language..."
  unless the user is explicitly asking about Jarvis itself.
- Prefer verified memories over assumptions.
- If the memories do not answer the question, say you do not know.
- Never invent facts.
- Be concise and accurate.
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
