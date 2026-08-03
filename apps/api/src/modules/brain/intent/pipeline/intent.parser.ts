export class IntentParser {
  static parse(llmOutput: string): Record<string, unknown> {
    try {
      return JSON.parse(llmOutput) as Record<string, unknown>;
    } catch {
      throw new Error('ParseError');
    }
  }
}
