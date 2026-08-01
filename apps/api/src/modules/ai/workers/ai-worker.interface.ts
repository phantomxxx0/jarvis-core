export interface AIWorker {
  readonly id: string;
  readonly name: string;

  health(): Promise<boolean>;

  chat(messages: unknown[]): Promise<unknown>;

  embed(text: string): Promise<number[]>;

  reason(prompt: string): Promise<unknown>;
}
