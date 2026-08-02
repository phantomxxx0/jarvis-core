import { ChatMessage } from '../../ai/interfaces/chat-message.interface';

export interface MemoryContext {
  id: string;
  score: number;
  content: string;
}

export interface ContextPayload {
  readonly history: readonly ChatMessage[];
  readonly semanticMemories: readonly MemoryContext[];
  readonly systemState?: Readonly<Record<string, unknown>>;
}
