import { ChatMessage } from '../../ai/interfaces/chat-message.interface';

export interface AIWorker {
  readonly id: string;

  readonly name: string;

  health(): Promise<boolean>;

  chat(messages: ChatMessage[]): Promise<string>;

  reason(prompt: string): Promise<string>;
}
