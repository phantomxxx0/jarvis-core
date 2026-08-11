export interface AIProvider {
  chat(messages: unknown[]): Promise<string>;

  embed(text: string): Promise<number[]>;

  reason(prompt: string): Promise<string>;
}
