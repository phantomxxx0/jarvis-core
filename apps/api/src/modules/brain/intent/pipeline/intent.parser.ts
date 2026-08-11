import { extractAndParseJson } from '../../../../utils/json.util';

export class IntentParser {
  static parse(llmOutput: string): Record<string, unknown> {
    try {
      return extractAndParseJson<Record<string, unknown>>(llmOutput);
    } catch (e) {
      throw new Error('ParseError');
    }
  }
}
