import { ChatMessage } from '../interfaces/chat-message.interface';

export interface AIWorker {
  readonly id: string;

  readonly name: string;

  health(): Promise<boolean>;

  chat(messages: ChatMessage[]): Promise<string>;

  embed(text: string): Promise<number[]>;

  reason(prompt: string): Promise<string>;
}
