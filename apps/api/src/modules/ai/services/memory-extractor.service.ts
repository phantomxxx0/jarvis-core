import { Injectable } from '@nestjs/common';

import { AIRouter } from '../../ai/router/ai.router';
import { ChatMessage } from '../../ai/interfaces/chat-message.interface';

@Injectable()
export class MemoryExtractorService {
  constructor(private readonly aiRouter: AIRouter) {}

  async extract(messages: ChatMessage[]): Promise<string[]> {
    const latest = messages.at(-1);

    if (!latest || latest.role !== 'user') {
      return [];
    }

    const prompt = `
You are a memory extraction engine.

Extract ONLY durable long-term facts.

Return ONLY a JSON array of strings.

Examples:

"My favorite language is Rust."

↓

[
  "Favorite programming language is Rust."
]

"My name is Arpan."

↓

[
  "User's name is Arpan."
]

"I use Arch Linux."

↓

[
  "User uses Arch Linux."
]

If nothing should be remembered:

[]

Conversation:

${latest.content}
`;

    const response = await this.aiRouter.reason(prompt);

    try {
      const parsed = JSON.parse(response) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === 'string')
      ) {
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  }
}
